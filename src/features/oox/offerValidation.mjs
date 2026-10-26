import {collectionOfferSpec,assertCollectionOfferEvents} from './collectionOfferValidation.mjs';
import {Buffer} from 'buffer';
import {Address} from '@multiversx/sdk-core';
export const OFFER_CONTRACT='erd1qqqqqqqqqqqqqpgqwp73w2a9eyzs64eltupuz3y3hv798vlv899qrjnflg';
export const OFFER_CODE_HASH='Fvr0g7JeYVmRko2shXZwy+c5U9BcCZOmCV9NzFzOuc8=';
const collections=new Set(['PITTZ-1a4c2d','PITTZVICE-c3ec94']);
export const addressHex=address=>Buffer.from(Address.newFromBech32(address).getPublicKey()).toString('hex');
export const hex=value=>{const h=BigInt(value).toString(16);return h.padStart(Math.ceil(h.length/2)*2,'0');};
const textHex=value=>Buffer.from(value).toString('hex');
export function offerAmount(value){if(typeof value!=='string'||! /^(?:0|[1-9]\d{0,12})(?:\.\d{1,18})?$/.test(value.trim()))throw Error('Enter a positive EGLD amount with up to 18 decimals.');const [whole,part='']=value.trim().split('.');const n=BigInt(whole)*10n**18n+BigInt(part.padEnd(18,'0'));if(n<=0n)throw Error('Enter a positive EGLD amount.');return n.toString();}
export function nftIdentity(nft){if(!collections.has(nft?.collection)||!new RegExp('^'+nft.collection+'-[0-9a-f]+$','i').test(nft.identifier||''))throw Error('Unsupported Pittz identifier.');const nonce=BigInt('0x'+nft.identifier.split('-').at(-1));if(nonce<=0n||nonce>0xffffffffffffffffn)throw Error('Invalid NFT nonce.');return {collection:nft.collection,nonce:nonce.toString()};}
export function offerSpec(review,now=Math.floor(Date.now()/1000)){
 if(review.scope==='collection')return collectionOfferSpec(review,now);
 const {action,address,nft,owner,amount,deadline,offer}=review;const {collection,nonce}=nftIdentity(nft);addressHex(address);addressHex(owner);
 if(address===OFFER_CONTRACT||(action!=='withdraw'&&(owner===OFFER_CONTRACT||addressHex(owner).startsWith('0000000000000000'))))throw Error('This Pittz is held by a contract. Direct wallet offers are unavailable.');
 let data,value='0',receiver=OFFER_CONTRACT;
 if(action==='offer'){
  if(owner===address)throw Error('You already own this Pittz.');
  if(!/^[1-9]\d*$/.test(String(amount)))throw Error('Invalid offer payment.');
  if(!Number.isSafeInteger(deadline)||deadline<=now+60||deadline>now+7*86400)throw Error('Choose an expiry between one minute and seven days.');
  value=String(amount);data=`sendOffer@${textHex(collection)}@${hex(nonce)}@01@${hex(deadline)}@${addressHex(owner)}`;
 }else{
  if(!offer||! /^[1-9]\d*$/.test(offer.id)||BigInt(offer.id)>0xffffffffffffffffn||offer.collection!==collection||offer.nonce!==nonce||offer.quantity!=='1'||offer.currency!=='EGLD'||offer.paymentNonce!=='0'||! /^[1-9]\d*$/.test(offer.amount)||offer.seller!==owner)throw Error('This direct EGLD offer could not be verified.');
  if(action==='withdraw'){
   if(offer.buyer!==address)throw Error('Only the offer creator can withdraw it.');
   data=`withdrawOffer@${hex(offer.id)}`;
  }else if(action==='accept'){
   if(owner!==address||offer.buyer===address||offer.deadline<=now)throw Error('This offer cannot be accepted by this wallet.');
   addressHex(offer.buyer);receiver=address;
   data=`ESDTNFTTransfer@${textHex(collection)}@${hex(nonce)}@01@${addressHex(OFFER_CONTRACT)}@${textHex('acceptOffer')}@${hex(offer.id)}`;
  }else throw Error('Unsupported offer action.');
 }
 return {sender:address,receiver,value,data,gasLimit:50000000,gasPrice:1000000000,chainID:'1',version:2};
}
const b64hex=h=>Buffer.from(h,'hex').toString('base64');
const b64num=n=>BigInt(n)===0n?'':b64hex(hex(n));
export function assertOfferEvents(events,review){
 if(review.scope==='collection')return assertCollectionOfferEvents(events,review);
 const {collection,nonce}=nftIdentity(review.nft);const action=review.action;
 const name={offer:'offer_token_event',withdraw:'withdraw_offer_token_event',accept:'accept_offer_token_event'}[action];
 const endpoint={offer:'sendOffer',withdraw:'withdrawOffer',accept:'acceptOffer'}[action];
 const raw=events.find(e=>e.address===OFFER_CONTRACT&&(e.identifier===name||(e.identifier===endpoint&&e.topics?.[0]===Buffer.from(name).toString('base64'))));
 const found=raw?{...raw,topics:raw.identifier===endpoint?raw.topics.slice(1):raw.topics}:null;
 if(events.some(e=>e.identifier==='signalError')||!found)throw Error('The marketplace did not confirm the expected offer action.');
 const t=found.topics||[],expected={1:Buffer.from(collection).toString('base64'),2:b64num(nonce),3:b64num(1),4:Buffer.from('EGLD').toString('base64'),5:'',6:b64num(action==='offer'?review.amount:review.offer.amount),7:b64hex(addressHex(action==='offer'?review.address:review.offer.buyer))};
 if(action!=='offer')expected[0]=b64num(review.offer.id);
 if(action==='offer'){expected[9]=b64num(review.deadline);expected[10]=b64hex(addressHex(review.owner));}
 if(action==='accept')expected[8]=b64hex(addressHex(review.address));
 for(const [i,value] of Object.entries(expected))if(t[i]!==value)throw Error('Offer event details do not match the review.');
 return found;
}
export function assertOfferSimulation(data,review){
 const result=data?.data?.result;const shards=result?.receiverShard?[result.receiverShard,...(result.senderShard?[result.senderShard]:[])]:[result];
 if(data?.code!=='successful'||shards.some(s=>!s||s.status!=='success'))throw Error('Offer simulation failed. Nothing has been submitted.');
 const events=shards.flatMap(s=>s.logs?.events||[]);assertOfferEvents(events,review);
 if(review.action==='withdraw'&&!events.some(e=>e.address===OFFER_CONTRACT&&e.identifier==='transferValueOnly'&&e.topics?.[0]===b64num(review.offer.amount)&&e.topics?.[1]===b64hex(addressHex(review.address))))throw Error('The withdrawal refund could not be verified.');
 return result;
}
