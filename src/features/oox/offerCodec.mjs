import {Buffer} from 'buffer';
import {Abi,BinaryCodec} from '@multiversx/sdk-core';
import definition from './offer-abi.json' with {type:'json'};
const abi=Abi.create(definition),codec=new BinaryCodec();
export function decodeOffer(encoded,global=false){
 if(typeof encoded!=='string'||!encoded||encoded.length>4096||! /^[A-Za-z0-9+/]*={0,2}$/.test(encoded))throw Error('Invalid offer response.');
 const bytes=Buffer.from(encoded,'base64'),value=codec.decodeTopLevel(bytes,abi.getStruct(global?'GlobalOffer':'OfferV2'));
 if(!Buffer.from(codec.encodeTopLevel(value)).equals(bytes))throw Error('Incomplete offer response.');
 const o=value.valueOf();const deadline=Number(o.deadline.toString());if(!Number.isSafeInteger(deadline)||deadline<0)throw Error('Invalid offer expiry.');
 return {id:o.offer_id.toString(),collection:o.offer_token.token_identifier,nonce:o.offer_token.token_nonce.toString(),quantity:o.offer_token.amount.toString(),currency:o.payment.token_identifier,paymentNonce:o.payment.token_nonce.toString(),amount:o.payment.amount.toFixed(0),buyer:o.offer_owner.toBech32(),seller:global?null:o.nft_owner.toBech32(),...(global?{scope:'collection',offerType:o.offer_type.name}:{}),deadline};
}

export const decodeCollectionOffer=encoded=>decodeOffer(encoded,true);
