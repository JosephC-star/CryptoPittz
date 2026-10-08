export const CONTRACT='erd1qqqqqqqqqqqqqpgq6wegs2xkypfpync8mn2sa5cmpqjlvrhwz5nqgepyg8';
const COLLECTIONS=['PITTZ-1a4c2d','PITTZVICE-c3ec94'];
export function hex(value){const s=BigInt(value).toString(16);return s.padStart(Math.ceil(s.length/2)*2,'0');}
export function textHex(value){return Array.from(new TextEncoder().encode(value),b=>b.toString(16).padStart(2,'0')).join('');}
export function validateListing(data,nft,buyer,now=Date.now()/1000){
 const s=data?.saleInfo,collection=nft.identifier.split('-').slice(0,2).join('-');
 if(!COLLECTIONS.includes(collection)||nft.collection!==collection||data?.identifier!==nft.identifier||data.collection!==collection)throw Error('XOXNO returned a different NFT.');
 if(!s||s.marketplace!=='xoxno')throw Error('This Pitt is no longer listed on XOXNO.');
 if(s.auctionType!=='Nft'||s.paymentToken!=='EGLD'||s.paymentTokenNonce!==0||s.quantity!==1)throw Error('Only fixed-price EGLD NFT purchases are supported on XOXNO here.');
 if(!Number.isSafeInteger(s.auctionId)||s.auctionId<=0||typeof s.minBid!=='string'||!/^\d{1,40}$/.test(s.minBid)||BigInt(s.minBid)<=0n||s.minBid!==s.maxBid)throw Error('The XOXNO fixed price could not be verified.');
 if(!Number.isSafeInteger(s.startTime)||!Number.isSafeInteger(s.deadline)||s.startTime<0||s.startTime>now||s.deadline<0||(s.deadline!==0&&s.deadline<=now))throw Error('This listing has not started or has expired.');
 if(!/^erd1[a-z0-9]{58}$/.test(s.seller)||buyer===s.seller)throw Error('You cannot buy your own listing.');
 const nonceText=nft.identifier.split('-').at(-1);
 if(!/^[a-f0-9]{1,16}$/.test(nonceText)||BigInt('0x'+nonceText)<=0n)throw Error('Invalid NFT nonce.');
 return {auctionId:s.auctionId,collection,nonce:BigInt('0x'+nonceText).toString(),price:s.minBid,seller:s.seller,startTime:s.startTime,deadline:s.deadline};
}
// Auction layout from XOXNO/rs-marketplace: src/auction.rs. Reject truncated or extended data.
export function decodeAuction(bytes){
 let offset=0;
 function take(n){if(!Number.isSafeInteger(n)||n<0||offset+n>bytes.length)throw Error('Invalid on-chain auction data.');const value=bytes.slice(offset,offset+n);offset+=n;return value;}
 function uint(n){return BigInt('0x'+Array.from(take(n),b=>b.toString(16).padStart(2,'0')).join(''));}
 function buffer(){const n=Number(uint(4));if(n>128)throw Error('Invalid auction field length.');return take(n);}
 function text(){return new TextDecoder('utf-8',{fatal:true}).decode(buffer());}
 function big(){const b=buffer();return b.length?BigInt('0x'+Array.from(b,x=>x.toString(16).padStart(2,'0')).join('')):0n;}
 const collection=text(),nonce=uint(8),quantity=big(),type=Number(uint(1)),paymentToken=text(),paymentNonce=uint(8),price=big(),hasMax=Number(uint(1));
 if(hasMax!==0&&hasMax!==1)throw Error('Invalid auction price option.');
 const max=hasMax?big():null,startTime=uint(8),deadline=uint(8),sellerHex=Array.from(take(32),b=>b.toString(16).padStart(2,'0')).join('');
 const currentBid=big(),winner=take(32);big();big();
 if(offset!==bytes.length)throw Error('Unsupported on-chain auction layout.');
 return {collection,nonce,quantity,type,paymentToken,paymentNonce,price,max,startTime,deadline,sellerHex,currentBid,winner};
}
export function verifyAuction(a,listing,sellerHex,now=Date.now()/1000){
 if(a.collection!==listing.collection||a.nonce!==BigInt(listing.nonce)||a.quantity!==1n||a.type!==2||a.paymentToken!=='EGLD'||a.paymentNonce!==0n||a.price!==BigInt(listing.price)||a.max!==a.price||a.sellerHex!==sellerHex||a.startTime!==BigInt(listing.startTime)||a.deadline!==BigInt(listing.deadline)||a.startTime>BigInt(Math.floor(now))||(a.deadline!==0n&&a.deadline<=BigInt(Math.floor(now)))||a.currentBid!==0n||a.winner.some(b=>b!==0))throw Error('XOXNO listing changed or does not match its on-chain auction. Refresh before buying.');
 return a;
}
export function purchaseSpec(listing,address){
 return {sender:address,receiver:CONTRACT,value:listing.price,gasLimit:45000000,gasPrice:1000000000,chainID:'1',version:2,data:`buy@${hex(listing.auctionId)}@${textHex(listing.collection)}@${hex(listing.nonce)}@01`};
}
export function checkTransaction(tx,spec){
 const p=tx.toSendable();
 for(const [key,value]of Object.entries({...spec,data:btoa(spec.data)}))if(p[key]!==value)throw Error('XOXNO transaction verification failed: '+key+'.');
 if(p.guardian||p.relayer||p.options||p.senderUsername||p.receiverUsername)throw Error('Unsupported XOXNO transaction configuration.');
 return p;
}
export function assertSimulation(data){
 const result=data?.data?.result;
 if(data?.code!=='successful'||!result)throw Error('Purchase simulation is unavailable. Please try again.');
 const shards=result.receiverShard?[result.receiverShard,...(result.senderShard?[result.senderShard]:[])]:[result];
 if(shards.some(s=>s.status!=='success'||s.logs?.events?.some(e=>e.identifier==='signalError')))throw Error('Purchase simulation failed. Refresh the listing before trying again.');
 return result;
}
