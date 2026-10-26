export const supportedCollections=['PITTZ-1a4c2d','PITTZVICE-c3ec94'];
export function normalizeXoxnoOffers(data,collection){
 if(!supportedCollections.includes(collection)||!Array.isArray(data?.resources)||data.resources.length>100)throw Error('Invalid XOXNO offer response.');
 return data.resources.filter(o=>o.collection===collection&&o.marketplace==='xoxno'&&o.isActive===true&&(!o.chain||o.chain==='MVX')&&o.paymentToken==='EGLD'&&o.paymentTokenNonce===0&&/^[1-9]\d*$/.test(o.price)&&Number.isSafeInteger(o.offerId)&&o.offerId>0&&Number.isSafeInteger(o.quantity)&&o.quantity>0&&Array.isArray(o.attributes)).map(o=>({id:String(o.offerId),amount:o.price,quantity:o.quantity,traits:o.attributes.filter(t=>typeof t.trait_type==='string'&&typeof t.value==='string').map(t=>({type:t.trait_type.slice(0,100),value:t.value.slice(0,150)})),traitOffer:o.attributes.length>0})).sort((a,b)=>BigInt(a.amount)>BigInt(b.amount)?-1:BigInt(a.amount)<BigInt(b.amount)?1:0);
}
