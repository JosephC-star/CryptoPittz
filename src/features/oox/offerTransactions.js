import {TransactionComputer} from '@multiversx/sdk-core';
import {getAccount} from '@multiversx/sdk-dapp/out/methods/account/getAccount';
import {getNetworkConfig} from '@multiversx/sdk-dapp/out/methods/network/getNetworkConfig';
import {getAccountProvider} from '@multiversx/sdk-dapp/out/providers/helpers/accountProvider';
import {TransactionManager} from '@multiversx/sdk-dapp/out/managers/TransactionManager/TransactionManager';
import {addressHex,getJson,buildTransaction,checkTransaction} from '../bonez-swap/transactions';
import {guardianForAccount,withGuardian,assertGuardianUnchanged} from '../bonez-swap/guarded';
import {transactionState} from '../../utils/transactionState.mjs';
import {decodeOffer} from './offerCodec.mjs';
import {offerSpec,offerAmount,nftIdentity,assertOfferSimulation,assertOfferEvents,OFFER_CONTRACT,OFFER_CODE_HASH} from './offerValidation.mjs';
const key=address=>'pittz-offer-pending-'+address;
let inFlight=false;
function context(expected){const address=getAccount().address;addressHex(address);if(expected&&address!==expected)throw Error('Wallet changed. Review the offer again.');if(getNetworkConfig().network.chainId!=='1')throw Error('Connect a mainnet wallet.');return address;}
async function verifiedContract(){const c=await getJson('https://api.multiversx.com/accounts/'+OFFER_CONTRACT);if(c.address!==OFFER_CONTRACT||c.codeHash!==OFFER_CODE_HASH)throw Error('Marketplace contract changed. Offer actions are paused for verification.');}
async function query(name,args){const r=await fetch('https://gateway.multiversx.com/vm-values/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scAddress:OFFER_CONTRACT,funcName:name,args}),signal:AbortSignal.timeout(15000)});const result=await r.json();const data=result?.data?.data;if(!r.ok||result.code!=='successful'||data?.returnCode!=='ok'||!Array.isArray(data.returnData)||data.returnData.length>2000)throw Error('Marketplace offers could not be read. Please try again.');return data.returnData.map(decodeOffer);}
async function readOffer(id){if(!/^[1-9]\d*$/.test(id))throw Error('Invalid offer.');let h=BigInt(id).toString(16);h=h.padStart(Math.ceil(h.length/2)*2,'0');const rows=await query('getFullOfferData',[h]);if(rows.length!==1||rows[0].id!==id)throw Error('Offer is no longer available. Refresh offers.');return rows[0];}
export async function loadOffers(nft,address){
 nftIdentity(nft);await verifiedContract();const item=await getJson('https://api.multiversx.com/nfts/'+nft.identifier+'?withOwner=true');
 if(item.identifier!==nft.identifier||item.collection!==nft.collection||item.type!=='NonFungibleESDT'||!item.owner)throw Error('NFT ownership could not be verified.');addressHex(item.owner);
 let rows=[];if(address){addressHex(address);const made=await query('getOffersByOwner',[addressHex(address)]);rows.push(...made);if(address===item.owner)rows.push(...await query('getOffersByNftOwner',[addressHex(address)]));}
 const identity=nftIdentity(nft),unique=new Map();
 for(const o of rows)if(o.collection===identity.collection&&o.nonce===identity.nonce&&o.quantity==='1'&&o.currency==='EGLD'&&o.paymentNonce==='0'&&BigInt(o.amount)>0n&&(o.buyer===address||o.seller===address))unique.set(o.id,o);
 return {owner:item.owner,offers:[...unique.values()].sort((a,b)=>BigInt(a.id)>BigInt(b.id)?-1:1)};
}
export function pendingOffer(address){if(!address)return null;const raw=localStorage.getItem(key(address));if(!raw)return null;let p;try{p=JSON.parse(raw);}catch{throw Error('Pending offer data is unavailable. Check wallet history before continuing.');}if(p.address!==address||! /^[a-f0-9]{64}$/.test(p.hash||''))throw Error('Pending offer data is invalid. Check wallet history before continuing.');return p;}
export async function checkPendingOffer(address){const pending=pendingOffer(address);if(!pending)return null;const tx=await getJson('https://api.multiversx.com/transactions/'+pending.hash+'?withScResults=true');
 if(tx.hash!==pending.hash||tx.sender!==pending.address||tx.receiver!==pending.spec.receiver||tx.data!==btoa(pending.spec.data)||String(tx.value)!==pending.spec.value)throw Error('Transaction receipt does not match the reviewed offer. Check Explorer.');
 const state=transactionState(tx);if(state==='confirmed'){assertOfferEvents([...(tx.logs?.events||[]),...(tx.smartContractResults||[]).flatMap(r=>r.logs?.events||[])],pending.review);localStorage.removeItem(key(address));}else if(state==='failed')localStorage.removeItem(key(address));return {...pending,state};}
async function previous(address){if(!pendingOffer(address))return;const p=await checkPendingOffer(address);if(p?.state==='pending')throw Error('Wait for your previous offer action to finish. Check its transaction status.');}
async function fresh(review,guardian,verifyGuardian=false){
 const address=context(review.address);await verifiedContract();const copy={...review};
 if(review.action==='offer'){
  const item=await getJson('https://api.multiversx.com/nfts/'+review.nft.identifier+'?withOwner=true');if(item.identifier!==review.nft.identifier||item.collection!==review.nft.collection||item.type!=='NonFungibleESDT'||item.owner!==review.owner)throw Error('NFT ownership changed. Refresh and review the offer again.');
 }else{const offer=await readOffer(review.offer.id);if(JSON.stringify(offer)!==JSON.stringify(review.offer))throw Error('Offer changed. Refresh offers.');copy.offer=offer;
  if(review.action==='accept'){const owned=await getJson('https://api.multiversx.com/accounts/'+address+'/nfts/'+review.nft.identifier);if(owned.identifier!==review.nft.identifier||owned.collection!==review.nft.collection||owned.type!=='NonFungibleESDT'||(owned.balance&&owned.balance!=='1'))throw Error('This wallet no longer holds the Pittz.');}
 }
 const account=await getJson('https://api.multiversx.com/accounts/'+address+'?withGuardianInfo=true');if(!Number.isSafeInteger(account.nonce)||account.nonce<0)throw Error('Wallet nonce could not be verified.');if(verifyGuardian)assertGuardianUnchanged(account,guardian,addressHex);
 const protection=guardianForAccount(account,addressHex),spec=withGuardian(offerSpec(copy),protection);if(BigInt(account.balance)<BigInt(spec.value)+BigInt(spec.gasLimit)*BigInt(spec.gasPrice))throw Error('Insufficient EGLD for this offer action and its maximum network fee.');return {account,guardian:protection,spec};
}
async function simulate(tx,review){const payload={...tx.toSendable(),signature:'0'.repeat(128),...(tx.guardian?.toBech32()&&tx.options&2?{guardianSignature:'0'.repeat(128)}:{})};const r=await fetch('https://api.multiversx.com/transaction/simulate?checkSignature=false',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Offer simulation is unavailable. Nothing has been submitted.');assertOfferSimulation(await r.json(),review);}
export async function prepareOffer({action,nft,owner,amount,days=1,offer}){
 const address=context();await previous(address);const review={action,nft:{identifier:nft.identifier,collection:nft.collection},address,owner,created:Date.now(),...(action==='offer'?{amount:offerAmount(amount),deadline:Math.floor(Date.now()/1000)+Number(days)*86400}:{offer})};if(action==='offer'&&![1,3,7].includes(Number(days)))throw Error('Choose a supported offer duration.');
 const f=await fresh(review);const tx=buildTransaction(f.spec,f.account.nonce);checkTransaction(tx,f.spec);await simulate(tx,review);context(address);return {...review,spec:f.spec,guardian:f.guardian,feeCap:(BigInt(f.spec.gasLimit)*BigInt(f.spec.gasPrice)).toString()};
}
export async function submitOffer(review){
 if(globalThis.navigator?.locks?.request)return navigator.locks.request('pittz-offer-'+review?.address,{ifAvailable:true},lock=>{if(!lock)throw Error('Another tab is already approving an offer. Finish that action first.');return submitOfferLocked(review);});
 return submitOfferLocked(review);
}
async function submitOfferLocked(review){
 if(import.meta.env.VITE_OOX_OFFERS!=='true')throw Error('Real offers are disabled in this build.');if(inFlight)throw Error('Another offer action is already in progress.');inFlight=true;let broadcast=false;
 try{if(!review||!Number.isFinite(review.created)||review.created>Date.now()||Date.now()-review.created>60000)throw Error('Review expired. Review this offer action again.');context(review.address);await previous(review.address);
  const f=await fresh(review,review.guardian,true);if(JSON.stringify(f.spec)!==JSON.stringify(review.spec))throw Error('Offer review changed. Review again.');const tx=buildTransaction(f.spec,f.account.nonce);checkTransaction(tx,f.spec);await simulate(tx,review);context(review.address);
  const signed=await getAccountProvider().signTransactions([tx]);if(signed?.length!==1)throw Error('Signing was cancelled.');checkTransaction(signed[0],f.spec,true);context(review.address);if(Date.now()-review.created>240000)throw Error('Signing took too long. Review again.');
  const latest=await fresh(review,review.guardian,true);if(BigInt(latest.account.nonce)!==signed[0].nonce)throw Error('Wallet nonce changed. Review again.');await simulate(signed[0],review);context(review.address);
  const hash=new TransactionComputer().computeTransactionHash(signed[0]);if(! /^[a-f0-9]{64}$/.test(hash))throw Error('Signed transaction hash could not be verified.');
  const pending={hash,address:review.address,spec:f.spec,review,created:Date.now()};localStorage.setItem(key(review.address),JSON.stringify(pending));broadcast=true;
  const manager=TransactionManager.getInstance(),sent=await manager.send(signed);if(sent?.[0]?.hash!==hash)throw Error('Unexpected broadcast response.');try{await manager.track(sent);}catch{/* Already broadcast; never resend because tracking failed. */}return {...pending,state:'pending'};
 }catch(error){if(broadcast)throw Error('Submission status is uncertain. Use the saved transaction link to check status; do not resend.');throw error;}finally{inFlight=false;}
}
