import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {collectionOfferSpec,isCollectionOffer} from '../src/features/oox/collectionOfferValidation.mjs';
import {assertOfferSimulation,assertOfferEvents,OFFER_CONTRACT} from '../src/features/oox/offerValidation.mjs';
import {decodeCollectionOffer} from '../src/features/oox/offerCodec.mjs';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/oox-collection-offer-simulation.json',import.meta.url)));
const codec=JSON.parse(readFileSync(new URL('./fixtures/oox-collection-offer-codec.json',import.meta.url)));
const direct=JSON.parse(readFileSync(new URL('./fixtures/oox-offer-review.json',import.meta.url)));
const now=fixture.review.deadline-86400;
const offer={...codec.offer,currency:'EGLD',amount:'1000000000000',deadline:now+86400};
test('live unsigned creation simulation matches collection, exact escrow amount, buyer and expiry',()=>{
 assertOfferSimulation(fixture.simulation,fixture.review);
 for(const change of [{collection:'PITTZVICE-c3ec94'},{amount:'1'},{address:direct.owner},{deadline:now+1}])assert.throws(()=>assertOfferSimulation(fixture.simulation,{...fixture.review,...change}));
});
test('live collection ABI roundtrip preserves offer type; unsupported currencies and trait types excluded',()=>{
 assert.deepEqual(decodeCollectionOffer(codec.encoded),codec.offer);
 assert(isCollectionOffer(offer));
 for(const change of [{currency:'BONEZ-ff9a73'},{offerType:'GlobalForCollectionWithTraits'},{nonce:'1'},{quantity:'2'},{paymentNonce:'1'},{collection:'FAKE-123456'}])assert(!isCollectionOffer({...offer,...change}));
 assert.throws(()=>decodeCollectionOffer(codec.encoded.slice(0,-4)));
});
test('creation escrows exactly one whole offer and rejects unsupported collections, zero and bad expiry',()=>{
 const spec=collectionOfferSpec(fixture.review,now);
 assert.equal(spec.data,`sendGlobalOffer@504954545a2d316134633264@${fixture.review.deadline.toString(16)}`);
 assert.equal(spec.value,fixture.review.amount);assert.equal(spec.receiver,OFFER_CONTRACT);
 for(const change of [{collection:'FAKE-123456'},{amount:'0'},{deadline:now-1},{deadline:now+8*86400}])assert.throws(()=>collectionOfferSpec({...fixture.review,...change},now));
});
test('withdrawal belongs to creator; acceptance transfers an exact selected NFT and rejects self, expiry, wrong collection and trait offers',()=>{
 const withdraw={...fixture.review,action:'withdraw',address:offer.buyer,offer};
 assert.match(collectionOfferSpec(withdraw,now).data,/^withdrawGlobalOffer@/);
 assert.throws(()=>collectionOfferSpec({...withdraw,address:direct.owner},now));
 const accept={...withdraw,action:'accept',address:direct.owner,nft:direct.nft};
 assert.match(collectionOfferSpec(accept,now).data,/^ESDTNFTTransfer@504954545a2d316134633264@01@01@/);
 for(const change of [{address:offer.buyer},{nft:{collection:'PITTZVICE-c3ec94',identifier:'PITTZVICE-c3ec94-01'}},{offer:{...offer,deadline:now}},{offer:{...offer,offerType:'GlobalForCollectionWithTraits'}}])assert.throws(()=>collectionOfferSpec({...accept,...change},now));
});
test('receipt validation rejects missing, wrong-id or wrong-amount settlement events',()=>{
 assert.throws(()=>assertOfferEvents([],fixture.review));
 const events=structuredClone(fixture.simulation.data.result.receiverShard.logs.events);
 const e=events.find(e=>e.identifier==='sendGlobalOffer');e.topics[5]='AQ==';
 assert.throws(()=>assertOfferEvents(events,fixture.review));
});
