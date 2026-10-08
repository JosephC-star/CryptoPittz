import {Address} from '@multiversx/sdk-core/out/core/address.js';
import {Transaction} from '@multiversx/sdk-core/out/core/transaction.js';
import {getAccount} from '@multiversx/sdk-dapp/out/methods/account/getAccount';
import {getNetworkConfig} from '@multiversx/sdk-dapp/out/methods/network/getNetworkConfig';
import {getAccountProvider} from '@multiversx/sdk-dapp/out/providers/helpers/accountProvider';
import {TransactionManager} from '@multiversx/sdk-dapp/out/managers/TransactionManager/TransactionManager';
import {CONTRACT,hex,validateListing,decodeAuction,verifyAuction,purchaseSpec,checkTransaction,assertSimulation} from './validation.js';
export async function json(url,body){
 const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(20000),...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
 const data=await r.json();if(!r.ok)throw Error(data.error||'XOXNO request unavailable. Please try again.');return data;
}
export function fetchListing(nft){return json(`/.netlify/functions/xoxno-nft?identifier=${encodeURIComponent(nft.identifier)}`);}
function context(expected){
 if(import.meta.env.VITE_OOX_TRANSACTIONS!=='true'||import.meta.env.VITE_OOX_PREVIEW!=='true')throw Error('Marketplace transactions are disabled.');
 const address=getAccount().address;Address.newFromBech32(address);
 if(expected&&address!==expected)throw Error('Wallet changed. Review the purchase again.');
 if(getNetworkConfig().network.chainId!=='1')throw Error('Connect a mainnet wallet.');return address;
}
function addressHex(address){return Array.from(Address.newFromBech32(address).getPublicKey(),b=>b.toString(16).padStart(2,'0')).join('');}
async function checkedListing(nft,address){
 const listing=validateListing(await fetchListing(nft),nft,address);Address.newFromBech32(listing.seller);
 const response=await json('https://gateway.multiversx.com/vm-values/query',{scAddress:CONTRACT,funcName:'getFullAuctionData',args:[hex(listing.auctionId)]});
 const result=response?.data?.data;
 if(response?.code!=='successful'||result?.returnCode!=='ok'||result.returnData?.length!==1)throw Error('Unable to verify the XOXNO auction on-chain.');
 const bytes=Uint8Array.from(atob(result.returnData[0]),c=>c.charCodeAt(0));
 verifyAuction(decodeAuction(bytes),listing,addressHex(listing.seller));return listing;
}
async function funds(address,value){
 const a=await json(`https://api.multiversx.com/accounts/${address}`);
 if(!Number.isSafeInteger(a.nonce)||a.nonce<0)throw Error('Unable to verify wallet nonce.');
 if(a.isGuarded)throw Error('Guarded wallets are not supported for this purchase yet.');
 if(BigInt(a.balance)<BigInt(value)+45000000n*1000000000n)throw Error('Insufficient EGLD for the purchase and its maximum network fee.');return a;
}
export function buildTransaction(spec,nonce){return new Transaction({sender:Address.newFromBech32(spec.sender),receiver:Address.newFromBech32(spec.receiver),nonce:BigInt(nonce),value:BigInt(spec.value),gasLimit:BigInt(spec.gasLimit),gasPrice:BigInt(spec.gasPrice),chainID:spec.chainID,version:spec.version,data:new TextEncoder().encode(spec.data)});}
async function simulate(tx){return assertSimulation(await json('https://api.multiversx.com/transaction/simulate?checkSignature=false',{...tx.toSendable(),signature:'0'.repeat(128)}));}
export async function prepare(nft){
 const address=context(),listing=await checkedListing(nft,address),spec=purchaseSpec(listing,address),a=await funds(address,spec.value);
 const tx=buildTransaction(spec,a.nonce);checkTransaction(tx,spec);await simulate(tx);context(address);
 return {address,nft,listing,spec,created:Date.now(),feeCap:'45000000000000000'};
}
let inFlight=false;
export async function submit(review){
 if(inFlight)throw Error('Another XOXNO purchase is in progress.');inFlight=true;let broadcastStarted=false;
 try{
  context(review.address);
  if(!Number.isFinite(review.created)||review.created>Date.now()||Date.now()-review.created>60000)throw Error('Purchase review expired. Review the current price again.');
  const listing=await checkedListing(review.nft,review.address),spec=purchaseSpec(listing,review.address);
  if(JSON.stringify(spec)!==JSON.stringify(review.spec)||listing.seller!==review.listing.seller)throw Error('Listing changed. Review the purchase again.');
  const account=await funds(review.address,spec.value),tx=buildTransaction(spec,account.nonce);checkTransaction(tx,spec);await simulate(tx);context(review.address);
  const signed=await getAccountProvider().signTransactions([tx]);
  if(signed?.length!==1)throw Error('Signing was cancelled.');checkTransaction(signed[0],spec);context(review.address);
  if(Date.now()-review.created>240000)throw Error('Signing took too long. Review the current listing again.');
  const latest=await checkedListing(review.nft,review.address);
  if(JSON.stringify(purchaseSpec(latest,review.address))!==JSON.stringify(spec)||latest.seller!==listing.seller)throw Error('Listing changed while signing. Review it again.');
  const current=await funds(review.address,spec.value);
  if(BigInt(current.nonce)!==signed[0].nonce)throw Error('Wallet nonce changed. Review the purchase again.');
  await simulate(signed[0]);context(review.address);
  const manager=TransactionManager.getInstance();broadcastStarted=true;const sent=await manager.send(signed);
  try{await manager.track(sent);}catch{/* Already broadcast. Never automatically retry. */}
  const hash=sent?.[0]?.hash;return {hash:/^[a-f0-9]{64}$/i.test(hash||'')?hash:null,expected:{sender:spec.sender,receiver:spec.receiver,value:spec.value,data:btoa(spec.data)}};
 }catch(e){if(broadcastStarted)throw Error('Submission status is uncertain. Check your wallet history before purchasing again.');throw e;}finally{inFlight=false;}
}
