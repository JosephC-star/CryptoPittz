import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CONTRACT,validateListing,decodeAuction,verifyAuction,purchaseSpec,checkTransaction,assertSimulation} from '../src/features/xoxno/validation.js';
import {handler} from '../netlify/functions/xoxno-nft.mjs';
const nft={identifier:'PITTZ-1a4c2d-0eb5',collection:'PITTZ-1a4c2d'};
const seller='erd1f6nthuy75xf67wajg64tqe6wxg3ll28qn96q4lkcafd52dld9f4s705vlk';
const data={...nft,saleInfo:{auctionId:1431489,seller,startTime:1786010064,deadline:0,marketplace:'xoxno',paymentToken:'EGLD',paymentTokenNonce:0,auctionType:'Nft',quantity:1,minBid:'2000000000000000000',maxBid:'2000000000000000000'}};
const time=1791475200;
// Actual getFullAuctionData response for the listing above, October 8, 2026.
const encoded='AAAADFBJVFRaLTFhNGMyZAAAAAAAAA61AAAAAQECAAAABEVHTEQAAAAAAAAAAAAAAAgbwW1nTsgAAAEAAAAIG8FtZ07IAAAAAAAAanRZ0AAAAAAAAAAATqa78J6hk687skaqsGdOMiP/qOCZdAr+2OpbRTftKmsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABZAAAAAID6A==';
const bytes=new Uint8Array(Buffer.from(encoded,'base64'));
const auction=()=>decodeAuction(bytes);
const listing=()=>validateListing(data,nft,undefined,time);
test('real auction data matches the exact NFT, price and seller',()=>{
 const a=auction();assert.equal(a.type,2);assert.equal(a.nonce,3765n);assert.equal(a.price,2000000000000000000n);
 assert.equal(verifyAuction(a,listing(),a.sellerHex,time),a);
});
test('no-deadline fixed-price listing is valid',()=>assert.equal(listing().deadline,0));
test('rejects buying own listing',()=>assert.throws(()=>validateListing(data,nft,seller,time),/own/));
test('rejects a foreign collection or mismatched NFT',()=>{
 assert.throws(()=>validateListing({...data,identifier:'PITTZ-1a4c2d-01'},nft,undefined,time));
 assert.throws(()=>validateListing({...data,collection:'OTHER-123456'},nft,undefined,time));
});
test('rejects auctions, token payments and multi-quantity sales',()=>{
 for(const change of [{auctionType:'NftBid'},{paymentToken:'BONEZ-ff9a73'},{paymentTokenNonce:1},{quantity:2},{marketplace:'oox'}])assert.throws(()=>validateListing({...data,saleInfo:{...data.saleInfo,...change}},nft,undefined,time));
});
test('rejects invalid atomic prices and unstarted or expired listings',()=>{
 for(const change of [{minBid:'2.0'},{minBid:'0',maxBid:'0'},{maxBid:'3000000000000000000'},{startTime:time+1},{deadline:time-1},{auctionId:0}])assert.throws(()=>validateListing({...data,saleInfo:{...data.saleInfo,...change}},nft,undefined,time));
});
test('chain data defeats spoofed API price, seller, quantity and nonce',()=>{
 for(const change of [{price:'1'},{nonce:'1'},{collection:'PITTZVICE-c3ec94'},{deadline:time+100}])assert.throws(()=>verifyAuction(auction(),{...listing(),...change},auction().sellerHex,time));
 assert.throws(()=>verifyAuction(auction(),listing(),'00'.repeat(32),time));
 for(const change of [{quantity:2n},{type:1},{currentBid:1n},{winner:new Uint8Array(32).fill(1)}])assert.throws(()=>verifyAuction({...auction(),...change},listing(),auction().sellerHex,time));
});
test('rejects truncated and extended chain data',()=>{
 for(const n of [0,4,20,bytes.length-1])assert.throws(()=>decodeAuction(bytes.slice(0,n)));
 assert.throws(()=>decodeAuction(new Uint8Array([...bytes,0])));
 const corrupt=bytes.slice();corrupt.fill(255,0,4);assert.throws(()=>decodeAuction(corrupt));
});
test('exact purchase fields use auction ID, collection, nonce and one NFT',()=>{
 const spec=purchaseSpec(listing(),seller);assert.equal(spec.receiver,CONTRACT);assert.equal(spec.data,'buy@15d7c1@504954545a2d316134633264@0eb5@01');assert.equal(spec.value,data.saleInfo.minBid);
 const payload={...spec,data:btoa(spec.data)};
 assert.deepEqual(checkTransaction({toSendable:()=>payload},spec),payload);
 for(const change of [{receiver:seller},{value:'1'},{data:btoa('buy@01')},{gasLimit:60000000},{chainID:'D'},{options:2},{guardian:seller},{relayer:seller}])assert.throws(()=>checkTransaction({toSendable:()=>({...payload,...change})},spec));
});
test('simulation must succeed in all shards and contain no contract error',()=>{
 assertSimulation({code:'successful',data:{result:{receiverShard:{status:'success'},senderShard:{status:'success'}}}});
 for(const result of [{status:'fail'},{receiverShard:{status:'success'},senderShard:{status:'fail'}},{status:'success',logs:{events:[{identifier:'signalError'}]}}])assert.throws(()=>assertSimulation({code:'successful',data:{result}}));
 assert.throws(()=>assertSimulation({code:'successful',data:{}}));
});
test('listing proxy rejects unrelated identifiers and mutations before any fetch',async()=>{
 assert.equal((await handler({httpMethod:'POST'})).statusCode,405);
 for(const identifier of ['OTHER-123456-01','PITTZ-1a4c2d-01/../../user','https://example.com'])assert.equal((await handler({httpMethod:'GET',queryStringParameters:{identifier}})).statusCode,400);
});
