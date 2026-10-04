import { Address } from '@multiversx/sdk-core';
import { OOXClient, parseAmount } from '@oox-marketplace/sdk';
import { getAccount } from '@multiversx/sdk-dapp/out/methods/account/getAccount';
import { getNetworkConfig } from '@multiversx/sdk-dapp/out/methods/network/getNetworkConfig';
import { getAccountProvider } from '@multiversx/sdk-dapp/out/providers/helpers/accountProvider';
import { TransactionManager } from '@multiversx/sdk-dapp/out/managers/TransactionManager/TransactionManager';
import { CONTRACT, validateQuote } from './validation';
import { checkTransaction } from './transactionValidation';
export const client = new OOXClient({ network: 'mainnet', marketplaceContract: CONTRACT });
export async function json(url) {
  const r=await fetch(url,{signal:AbortSignal.timeout(15000)});
  if(!r.ok) throw Error(`Network request failed (${r.status}).`);
  return r.json();
}
export function hex(value) { const s=BigInt(value).toString(16); return s.padStart(Math.ceil(s.length/2)*2,'0'); }
export function textHex(value) { return Array.from(new TextEncoder().encode(value),b=>b.toString(16).padStart(2,'0')).join(''); }
async function context() {
  if(import.meta.env.VITE_OOX_TRANSACTIONS!=='true'||import.meta.env.VITE_OOX_PREVIEW!=='true') throw Error('Owner testing is disabled.');
  const address=getAccount().address;
  Address.newFromBech32(address);
  if(getNetworkConfig().chainID!=='1') throw Error('Connect a mainnet wallet.');
  const config=await client.api.getConfig();
  if(config.chainId!=='1'||config.network!=='mainnet'||config.marketplaceContract!==CONTRACT) throw Error('OOX contract/network mismatch.');
  const a=await json(`https://gateway.multiversx.com/address/${address}`);
  const account=a.data?.account;
  if(!Number.isSafeInteger(account?.nonce)) throw Error('Could not verify wallet nonce.');
  return {address,account};
}
export async function prepare(action,nft,listing,price,days) {
  const {address,account}=await context();
  let tx,expected,amount=0n;
  if(action==='buy') {
    const result=await client.prepareBuy({buyer:address,auctionId:listing.auctionId,nonce:BigInt(account.nonce)});
    validateQuote(result.quote,listing,nft,address);
    tx=result.transaction; amount=BigInt(result.quote.totalPrice);
    expected={sender:address,receiver:CONTRACT,value:amount.toString(),gasLimit:16000000,data:btoa(`buy@${hex(listing.auctionId)}@${textHex(nft.collection)}@${hex(listing.nonce)}`)};
  } else {
    if(!['PITTZ-1a4c2d','PITTZVICE-c3ec94'].includes(nft.collection)) throw Error('Unsupported collection.');
    const nonce=Number.parseInt(nft.identifier.split('-').at(-1),16);
    if(!Number.isSafeInteger(nonce)||nonce<=0) throw Error('Invalid NFT nonce.');
    const owned=await json(`https://api.multiversx.com/accounts/${address}/nfts/${nft.identifier}`);
    if(owned.identifier!==nft.identifier||owned.collection!==nft.collection||owned.type!=='NonFungibleESDT'||(owned.balance && BigInt(owned.balance)!==1n)) throw Error('Wallet ownership could not be confirmed.');
    const atomic=parseAmount(price.trim(),18);
    if(atomic<=0n||![1,7,30].includes(days)) throw Error('Enter a positive EGLD price and supported duration.');
    const deadline=Math.floor(Date.now()/1000)+days*86400;
    [tx]=await client.tx.list({sender:address,nonce:BigInt(account.nonce),nfts:[{collection:nft.collection,nftNonce:nonce,quantity:1n}],minBid:atomic,maxBid:atomic,paymentToken:'EGLD',deadline});
    const contractHex=Array.from(Address.newFromBech32(CONTRACT).getPublicKey(),b=>b.toString(16).padStart(2,'0')).join('');
    expected={sender:address,receiver:address,value:'0',gasLimit:12000000,data:btoa(`ESDTNFTTransfer@${textHex(nft.collection)}@${hex(nonce)}@01@${contractHex}@${textHex('auctionToken')}@${hex(atomic)}@${hex(atomic)}@${hex(deadline)}@${textHex('EGLD')}@@`)};
  }
  const payload=checkTransaction(tx,expected);
  const feeCap=BigInt(payload.gasLimit)*BigInt(payload.gasPrice);
  if(BigInt(account.balance)<amount+feeCap) throw Error('Insufficient EGLD for this action and its conservative fee cap.');
  return {tx,expected,payload,address,nft,listing,action,created:Date.now(),feeCap:feeCap.toString()};
}
let inFlight=false;
export async function submit(review) {
  if(inFlight) throw Error('Another marketplace transaction is in progress.');
  inFlight=true;
  try {
    if(Date.now()-review.created>60000) throw Error('Review expired. Prepare it again.');
    if(getAccount().address!==review.address||getNetworkConfig().chainID!=='1') throw Error('Wallet or network changed.');
    if(review.action==='buy') {
      const quote=await client.api.getQuote({buyer:review.address,auctionId:review.listing.auctionId});
      validateQuote(quote,review.listing,review.nft,review.address);
    } else {
      const owned=await json(`https://api.multiversx.com/accounts/${review.address}/nfts/${review.nft.identifier}`);
      if(owned.identifier!==review.nft.identifier||owned.type!=='NonFungibleESDT') throw Error('This Pitt is no longer available in the test wallet.');
    }
    checkTransaction(review.tx,review.expected);
    const signed=await getAccountProvider().signTransactions([review.tx]);
    if(signed?.length!==1) throw Error('Signing was cancelled.');
    // Providers may update nonce; all purchase/listing and payment fields must stay exact.
    checkTransaction(signed[0],review.expected);
    if(getAccount().address!==review.address||getNetworkConfig().chainID!=='1') throw Error('Wallet/network changed before sending.');
    if(review.action==='buy') validateQuote(await client.api.getQuote({buyer:review.address,auctionId:review.listing.auctionId}),review.listing,review.nft,review.address);
    if(getAccount().address!==review.address||getNetworkConfig().chainID!=='1') throw Error('Wallet/network changed before broadcast.');
    const manager=TransactionManager.getInstance();
    const sent=await manager.send(signed);
    let session;
    try {session=await manager.track(sent);} catch { /* Broadcast occurred; never automatically retry. */ }
    return {sent,session};
  } finally {inFlight=false;}
}
