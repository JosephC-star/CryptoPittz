const BONEZ = 'BONEZ-ff9a73';
const hex = value => {const s=BigInt(value).toString(16);return s.padStart(Math.ceil(s.length/2)*2,'0');};
const textHex = value => Array.from(new TextEncoder().encode(value),byte=>byte.toString(16).padStart(2,'0')).join('');

export function buyExpected(address,nft,listing,price,contract) {
  const args=`${hex(listing.auctionId)}@${textHex(nft.collection)}@${hex(listing.nonce)}`;
  if(!['EGLD',BONEZ].includes(listing.paymentToken))throw Error('Unsupported purchase currency.');
  const bonez=listing.paymentToken===BONEZ;
  const data=bonez?`ESDTTransfer@${textHex(BONEZ)}@${hex(price)}@${textHex('buy')}@${args}`:`buy@${args}`;
  return {sender:address,receiver:contract,value:bonez?'0':String(price),gasLimit:16000000,data:btoa(data)};
}

export function assertPurchaseFunds(egld,bonez,price,feeCap) {
  if(typeof bonez!=='string'||!/^\d+$/.test(bonez)||BigInt(bonez)<BigInt(price))throw Error('Insufficient BONEZ for this purchase.');
  if(BigInt(egld)<BigInt(feeCap))throw Error('Keep enough EGLD in your wallet for the network fee.');
}
