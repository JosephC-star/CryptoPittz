import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {offerAmount,offerSpec,assertOfferSimulation,OFFER_CONTRACT} from '../src/features/oox/offerValidation.mjs';
import {decodeOffer} from '../src/features/oox/offerCodec.mjs';
const fixture=name=>JSON.parse(readFileSync(new URL('./fixtures/'+name,import.meta.url)));
const review=fixture('oox-offer-review.json'),simulation=fixture('oox-offer-simulation.json');
const now=review.deadline-86400;
const offer={id:'42',collection:review.nft.collection,nonce:'1',quantity:'1',currency:'EGLD',paymentNonce:'0',amount:review.amount,buyer:review.address,seller:review.owner,deadline:review.deadline};
test('on-site offer amounts preserve exact EGLD precision and reject invalid values',()=>{
 assert.equal(offerAmount('0.000000000000000001'),'1');assert.equal(offerAmount('123.456'),'123456000000000000000');
 for(const value of ['0','-1','1e3','1,000','NaN','Infinity','1.0000000000000000001','01',1,null])assert.throws(()=>offerAmount(value));
});
test('direct offer payload commits exact NFT, owner, amount and expiry to the pinned marketplace',()=>{
 const spec=offerSpec(review,now);assert.equal(spec.receiver,OFFER_CONTRACT);assert.equal(spec.value,review.amount);assert(spec.data.startsWith('sendOffer@504954545a2d316134633264@01@01@'));assert.equal(spec.chainID,'1');
 assert.throws(()=>offerSpec({...review,owner:review.address},now),/already own/);assert.throws(()=>offerSpec({...review,owner:OFFER_CONTRACT},now),/contract/);
 assert.throws(()=>offerSpec({...review,deadline:now+60},now),/expiry/);assert.throws(()=>offerSpec({...review,deadline:now+8*86400},now),/expiry/);
 assert.throws(()=>offerSpec({...review,nft:{...review.nft,collection:'OTHER-abc123'}},now),/Unsupported/);
});
test('only the creator can withdraw; only the current intended seller can accept a live direct EGLD offer',()=>{
 const withdraw=offerSpec({...review,action:'withdraw',offer},now);assert.equal(withdraw.data,'withdrawOffer@2a');assert.equal(withdraw.value,'0');
 const accept=offerSpec({...review,action:'accept',address:review.owner,offer},now);assert.equal(accept.receiver,review.owner);assert.equal(accept.value,'0');assert(accept.data.startsWith('ESDTNFTTransfer@504954545a2d316134633264@01@01@'));assert(accept.data.endsWith('@6163636570744f66666572@2a'));
 for(const patch of [{currency:'BONEZ-ff9a73'},{nonce:'2'},{quantity:'2'},{paymentNonce:'1'},{seller:review.address}])assert.throws(()=>offerSpec({...review,action:'withdraw',offer:{...offer,...patch}},now));
 assert.throws(()=>offerSpec({...review,action:'withdraw',address:review.owner,offer},now),/creator/);
 assert.throws(()=>offerSpec({...review,action:'accept',address:review.owner,offer:{...offer,deadline:now}},now),/cannot be accepted/);
});
test('actual unsigned mainnet simulation proves exact sendOffer event fields and cross-shard success',()=>{
 assert.doesNotThrow(()=>assertOfferSimulation(simulation,review));
 for(const field of ['amount','deadline','owner']){const changed={...review,[field]:field==='amount'?'2':field==='deadline'?review.deadline+1:review.address};assert.throws(()=>assertOfferSimulation(simulation,changed),/do not match/);}
 const failed=structuredClone(simulation);failed.data.result.senderShard.status='fail';assert.throws(()=>assertOfferSimulation(failed,review),/simulation failed/);
 const noEvent=structuredClone(simulation);noEvent.data.result.receiverShard.logs.events=[];assert.throws(()=>assertOfferSimulation(noEvent,review),/did not confirm/);
 const signal=structuredClone(simulation);signal.data.result.receiverShard.logs.events.push({identifier:'signalError'});assert.throws(()=>assertOfferSimulation(signal,review));
});
test('ABI decoding round-trips an existing on-chain offer and rejects corrupt or trailing data',()=>{
 const encoded=fixture('oox-offer-codec.json').encoded;const o=decodeOffer(encoded);assert.equal(o.id,'32');assert.equal(o.currency,'EGLD');assert.equal(o.amount,'100000000000000000');assert.equal(o.buyer,review.address);
 for(const invalid of ['', 'not base64!',encoded.slice(0,40),Buffer.concat([Buffer.from(encoded,'base64'),Buffer.from([0])]).toString('base64')])assert.throws(()=>decodeOffer(invalid));
});
test('actual unsigned withdrawal simulation confirms contract refund recipient and amount',()=>{
 const data=fixture('oox-withdraw-simulation.json');const receiver=data.data.result.receiverShard;assert.equal(data.code,'successful');assert.equal(receiver.status,'success');assert.equal(data.data.result.senderShard.status,'success');const refund=receiver.logs.events.find(e=>e.address===OFFER_CONTRACT&&e.identifier==='transferValueOnly');assert.equal(refund.topics[0],Buffer.from('016345785d8a0000','hex').toString('base64'));assert.equal(refund.topics[1],Buffer.from('fc9c8135aec431262fc3158d87873eed099ded29a3d8ccfec1f4481f21103215','hex').toString('base64'));assert(receiver.logs.events.some(e=>e.identifier==='withdrawOffer'));
});
