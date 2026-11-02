import test from 'node:test';
import assert from 'node:assert/strict';
import {compareListingValues,comparePittzNumber,matchesPittzNumber,compareExplorerRanks} from '../src/utils/pittzSort.mjs';
import {handler} from '../netlify/functions/oox-listings.mjs';
test('price order compares USD estimates across currencies, not token amounts',()=>{
 const listings=[{id:'bonez',paymentToken:'BONEZ-ff9a73',price:'69420',dollarValue:7.26},{id:'egld',paymentToken:'EGLD',price:'1.737',dollarValue:5.94},{id:'other',paymentToken:'OTHER-123456',price:'50',dollarValue:6.5},{id:'unknown',paymentToken:'BONEZ-ff9a73',price:'1',dollarValue:null}];
 assert.deepEqual([...listings].sort((a,b)=>compareListingValues(a,b,'price-asc')).map(x=>x.id),['egld','other','bonez','unknown']);
 assert.deepEqual([...listings].sort((a,b)=>compareListingValues(a,b,'price-desc')).map(x=>x.id),['bonez','other','egld','unknown']);
 for(const dollarValue of [null,undefined,0,-1,'bad',Infinity])assert.equal(compareListingValues({dollarValue},{dollarValue:5},'price-desc'),1);
});
test('newest and oldest order listing dates with missing dates last',()=>{
 const rows=[{id:'old',listedAt:100},{id:'new',listedAt:300},{id:'unknown',timestamp:500}];
 assert.deepEqual([...rows].sort((a,b)=>compareListingValues(a,b,'newest')).map(x=>x.id),['new','old','unknown']);
 assert.deepEqual([...rows].sort((a,b)=>compareListingValues(a,b,'oldest')).map(x=>x.id),['old','new','unknown']);
});
test('Pittz numbers sort numerically rather than alphabetically',()=>{
 const rows=[100,60,9].map(n=>({name:'CryptoPittz #'+n}));
 assert.deepEqual(rows.sort(comparePittzNumber).map(n=>n.name),['CryptoPittz #9','CryptoPittz #60','CryptoPittz #100']);
});
test('listing feed exposes listing start dates and keeps missing dates unknown',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async()=>({ok:true,json:async()=>[
   {identifier:'PITTZ-1a4c2d-01',price:'69420',buyTokenId:'BONEZ-ff9a73',dollarValue:'7.26',auctionStartTime:1785525012,timestamp:1644237828},
   {identifier:'PITTZ-1a4c2d-02',price:'2',auctionInfo:{auctionStart:1785525013}},
   {identifier:'PITTZ-1a4c2d-03',price:'1',timestamp:1644237828}
  ]});
  const result=await handler({queryStringParameters:{collection:'PITTZ-1a4c2d'}});
  const rows=JSON.parse(result.body).listings;
  assert.deepEqual(rows.map(x=>x.listedAt),[1785525012,1785525013,null]);
  assert.equal(rows[0].dollarValue,7.26);assert.equal(rows[0].price,'69420');
 }finally{globalThis.fetch=original;}
});

test('Explorer number search matches exact displayed numbers across both collections',()=>{
 const nft={name:'CryptoPittz #60',identifier:'PITTZ-1a4c2d-3c'};
 for(const query of ['60','#60','060',''])assert(matchesPittzNumber(nft,query));
 for(const query of ['6','600','PITTZ-1a4c2d-3c','word'])assert(!matchesPittzNumber(nft,query));
 assert(matchesPittzNumber({name:'CryptoPittz VICE #60'},'60'));
});

test('Explorer high rank begins at #1 and low rank begins with the worst number',()=>{
 const ranks=[25,1,5310,9,null,undefined,0];
 assert.deepEqual([...ranks].sort((a,b)=>compareExplorerRanks(a,b)).slice(0,4),[1,9,25,5310]);
 assert.deepEqual([...ranks].sort((a,b)=>compareExplorerRanks(a,b,'rank-low-to-high')).slice(0,4),[5310,25,9,1]);
 for(const rank of [null,undefined,0,-1,'bad',Infinity]){
  assert.equal(compareExplorerRanks(rank,1,'rank-high-to-low'),1);
  assert.equal(compareExplorerRanks(rank,5310,'rank-low-to-high'),1);
 }
});
