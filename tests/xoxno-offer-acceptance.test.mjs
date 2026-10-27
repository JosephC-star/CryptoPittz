import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {decodeXoxnoOffer,xoxnoAcceptanceSpec,assertXoxnoAcceptanceEvents} from '../src/features/xoxno/offerAcceptance.mjs';
import {assertOfferSimulation} from '../src/features/oox/offerValidation.mjs';
import {handler} from '../netlify/functions/xoxno-offer-auth.mjs';
const f=JSON.parse(readFileSync(new URL('./fixtures/xoxno-offer-accept-simulation.json',import.meta.url))),r=f.review;
const events=f.simulation.data.result.logs.events;
test('real unsigned same-shard guarded-wallet simulation verifies exact XOXNO settlement',()=>{assertOfferSimulation(f.simulation,r);assert.deepEqual(decodeXoxnoOffer(r.chainEncoded),r.chainOffer);for(const change of [{address:r.chainOffer.buyer},{nft:{...r.nft,identifier:r.nft.collection+'-01'}},{chainEncoded:r.chainEncoded.slice(0,-4)}])assert.throws(()=>assertXoxnoAcceptanceEvents(events,{...r,...change}));});
test('XOXNO payload commits one selected NFT to pinned marketplace and offer; rejects own offer, wrong collection/currency and exhausted quantity',()=>{
 const s=xoxnoAcceptanceSpec(r);assert.match(s.data,/^ESDTNFTTransfer@504954545a2d316134633264@1b35@01@/);assert.equal(s.value,'0');assert.equal(s.receiver,r.address);
 for(const change of [{address:r.chainOffer.buyer},{nft:{collection:'PITTZVICE-c3ec94',identifier:'PITTZVICE-c3ec94-01'}},{chainOffer:{...r.chainOffer,currency:'BONEZ'}},{chainOffer:{...r.chainOffer,quantity:'0'}}])assert.throws(()=>xoxnoAcceptanceSpec({...r,...change}));
 assert.throws(()=>decodeXoxnoOffer(r.chainEncoded.slice(0,-8)));
});
test('trait authorization must bind exact seller, collection, nonce, offer and restriction bytes',()=>{
 const chainOffer={...r.chainOffer,attributes:'abcd'},nonce=BigInt('0x'+r.nft.identifier.split('-').at(-1)).toString();
 const seller=Buffer.from(events.find(e=>e.topics?.[0]===Buffer.from('accept_global_offer').toString('base64')).topics[2],'base64').toString('hex');
 const data=seller+Buffer.from(chainOffer.collection).toString('hex')+Buffer.from(nonce).toString('hex')+Buffer.from(chainOffer.id).toString('hex')+chainOffer.attributes;
 assert.match(xoxnoAcceptanceSpec({...r,chainOffer,authorization:{data,signature:'ab'.repeat(64)}}).data,/@057b5d@@/);
 for(const authorization of [undefined,{data:'00',signature:'ab'.repeat(64)},{data,signature:'ab'}])assert.throws(()=>xoxnoAcceptanceSpec({...r,chainOffer,authorization}));
});
test('sender-only cross-shard routing and error events cannot authorize acceptance',()=>{assert.throws(()=>assertXoxnoAcceptanceEvents([{identifier:'ESDTNFTTransfer',topics:[]}],r),/did not confirm/);assert.throws(()=>assertXoxnoAcceptanceEvents([...events,{identifier:'signalError'}],r));});
test('authorization proxy restricts modes, collections and forwarding destination',async()=>{
 assert.equal((await handler({httpMethod:'GET'})).statusCode,405);assert.equal((await handler({httpMethod:'POST',body:JSON.stringify({action:'sign',collection:'FAKE',offerId:1,identifier:'FAKE-01'})})).statusCode,400);
 assert.equal((await handler({httpMethod:'POST',body:JSON.stringify({action:'sign',collection:r.nft.collection,offerId:359261,identifier:r.nft.identifier})})).statusCode,401);
 const saved=global.fetch;try{global.fetch=async(url,options)=>{assert.equal(url,'https://api.xoxno.com/collection/PITTZ-1a4c2d/sign-offer');assert.equal(options.headers.Authorization,'Bearer test.token');return Response.json({data:'aa',signature:'bb'});};const result=await handler({httpMethod:'POST',headers:{authorization:'Bearer test.token'},body:JSON.stringify({action:'sign',collection:r.nft.collection,identifier:r.nft.identifier,offerId:359261})});assert.equal(result.statusCode,200);assert.deepEqual(JSON.parse(result.body),{data:'aa',signature:'bb'});}finally{global.fetch=saved;}
});
