import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {groupReceivedOffers} from '../src/features/my-pittz/receivedOffers.mjs';
const r=JSON.parse(readFileSync(new URL('./fixtures/oox-offer-review.json',import.meta.url))),now=1000;
const offer={id:'1',collection:r.nft.collection,nonce:'1',quantity:'1',currency:'EGLD',paymentNonce:'0',amount:'999999999999999999',buyer:r.address,seller:r.owner,deadline:2000};
test('offers tab shows each owned Pittz once with precise highest amount and offer count',()=>{
 const result=groupReceivedOffers([offer,{...offer,id:'2',amount:'1000000000000000000'},offer],[r.nft],r.owner,now);assert.equal(result.length,1);assert.equal(result[0].offers.length,2);assert.equal(result[0].highest,'1000000000000000000');assert.equal(result[0].nft.identifier,r.nft.identifier);
});
test('expired, old-owner, self, other-currency and unowned NFT offers do not appear',()=>{
 const invalid=[{...offer,deadline:now},{...offer,seller:r.address},{...offer,buyer:r.owner},{...offer,currency:'BONEZ-ff9a73'},{...offer,paymentNonce:'1'},{...offer,quantity:'2'},{...offer,nonce:'2'},null];assert.deepEqual(groupReceivedOffers(invalid,[r.nft],r.owner,now),[]);assert.deepEqual(groupReceivedOffers([offer],[],r.owner,now),[]);assert.deepEqual(groupReceivedOffers([offer],[r.nft],r.address,now),[]);
});
test('Original and Vice Pittz are combined, sorted by best offer without floating-point loss',()=>{
 const vice={collection:'PITTZVICE-c3ec94',identifier:'PITTZVICE-c3ec94-02'};const rows=groupReceivedOffers([offer,{...offer,id:'2',collection:vice.collection,nonce:'2',amount:'1000000000000000000'}],[r.nft,vice],r.owner,now);assert.deepEqual(rows.map(x=>x.nft.identifier),[vice.identifier,r.nft.identifier]);
});
test('expired offers drop out as time changes and sold NFT ownership intersection clears the card',()=>{
 assert.equal(groupReceivedOffers([offer],[r.nft],r.owner,now).length,1);assert.equal(groupReceivedOffers([offer],[r.nft],r.owner,2000).length,0);assert.equal(groupReceivedOffers([offer],[],r.owner,now).length,0);
});
