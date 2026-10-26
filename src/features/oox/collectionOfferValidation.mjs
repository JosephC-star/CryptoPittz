import {Buffer} from 'buffer';
import {addressHex,hex,nftIdentity,OFFER_CONTRACT} from './offerValidation.mjs';
export const COLLECTIONS={'PITTZ-1a4c2d':'Original Pittz','PITTZVICE-c3ec94':'Vice Pittz'};
const text=value=>Buffer.from(value).toString('hex');
export function isCollectionOffer(o){return !!o&&o.scope==='collection'&&o.offerType==='GlobalForCollection'&&Object.hasOwn(COLLECTIONS,o.collection)&&o.nonce==='0'&&o.quantity==='1'&&o.currency==='EGLD'&&o.paymentNonce==='0'&&/^[1-9]\d*$/.test(o.amount)&&/^[1-9]\d*$/.test(o.id)&&BigInt(o.id)<=0xffffffffffffffffn&&Number.isSafeInteger(o.deadline);}
export function collectionOfferSpec(r,now=Math.floor(Date.now()/1000)){
 const {action,address,collection,offer}=r;addressHex(address);if(!Object.hasOwn(COLLECTIONS,collection)||addressHex(address).startsWith('0000000000000000'))throw Error('Unsupported collection or wallet.');
 let value='0',receiver=OFFER_CONTRACT,data;
 if(action==='offer'){
  if(!/^[1-9]\d*$/.test(r.amount)||!Number.isSafeInteger(r.deadline)||r.deadline<=now+60||r.deadline>now+7*86400)throw Error('Invalid collection offer amount or expiry.');
  value=r.amount;data=`sendGlobalOffer@${text(collection)}@${hex(r.deadline)}`;
 }else{
  if(!isCollectionOffer(offer)||offer.collection!==collection)throw Error('Collection offer could not be verified.');addressHex(offer.buyer);
  if(action==='withdraw'){if(offer.buyer!==address)throw Error('Only the offer creator can withdraw it.');data=`withdrawGlobalOffer@${hex(offer.id)}`;}
  else if(action==='accept'){
   const nft=nftIdentity(r.nft);if(nft.collection!==collection||offer.buyer===address||offer.deadline<=now)throw Error('This collection offer cannot be accepted.');
   receiver=address;data=`ESDTNFTTransfer@${text(collection)}@${hex(nft.nonce)}@01@${addressHex(OFFER_CONTRACT)}@${text('acceptGlobalOffer')}@${hex(offer.id)}`;
  }else throw Error('Unsupported collection offer action.');
 }
 return {sender:address,receiver,value,data,gasLimit:50000000,gasPrice:1000000000,chainID:'1',version:2};
}
const b64=value=>Buffer.from(value,'hex').toString('base64');
const num=value=>BigInt(value)===0n?'':b64(hex(value));
export function assertCollectionOfferEvents(events,r){
 const name={offer:'collection_offer_event',withdraw:'withdraw_collection_offer_event',accept:'accept_collection_offer_event'}[r.action];
 const endpoint={offer:'sendGlobalOffer',withdraw:'withdrawGlobalOffer',accept:'acceptGlobalOffer'}[r.action];
 const raw=events.find(e=>e.address===OFFER_CONTRACT&&(e.identifier===name||(e.identifier===endpoint&&e.topics?.[0]===Buffer.from(name).toString('base64'))));
 if(events.some(e=>e.identifier==='signalError')||!raw)throw Error('Marketplace did not confirm the collection offer action.');
 const topics=raw.identifier===endpoint?raw.topics.slice(1):raw.topics;
 let expected;
 if(r.action==='accept')expected={0:num(r.offer.id),1:Buffer.from(r.collection).toString('base64'),2:num(nftIdentity(r.nft).nonce),3:num(1),4:Buffer.from('EGLD').toString('base64'),5:'',6:num(r.offer.amount),7:b64(addressHex(r.offer.buyer)),8:b64(addressHex(r.address))};
 else {expected={1:Buffer.from(r.collection).toString('base64'),2:Buffer.from('EGLD').toString('base64'),3:'',4:num(r.action==='offer'?r.amount:r.offer.amount),5:b64(addressHex(r.action==='offer'?r.address:r.offer.buyer))};if(r.action==='offer')expected[7]=num(r.deadline);else expected[0]=num(r.offer.id);}
 if(!topics?.[0]||Object.entries(expected).some(([i,v])=>topics[i]!==v))throw Error('Collection offer event details do not match the review.');
 return raw;
}
