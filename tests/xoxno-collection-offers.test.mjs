import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeXoxnoOffers} from '../src/features/xoxno/collectionOffers.mjs';
import {handler} from '../netlify/functions/xoxno-collection-offers.mjs';
const collection='PITTZ-1a4c2d';const offer={collection,marketplace:'xoxno',isActive:true,paymentToken:'EGLD',paymentTokenNonce:0,price:'1540000000000000000',offerId:359261,quantity:1,attributes:[]};
test('XOXNO price remains exact, quantity is retained and traits are separate from collection-wide offers',()=>{
 const rows=normalizeXoxnoOffers({resources:[offer,{...offer,offerId:2,quantity:2,price:'2200000000000000000',attributes:[{trait_type:'Eye',value:'Diamond'}]}]},collection);assert.equal(rows[0].amount,'2200000000000000000');assert.equal(rows[0].quantity,2);assert.equal(rows[0].traitOffer,true);assert.equal(rows[1].traitOffer,false);
 for(const change of [{marketplace:'oox'},{collection:'PITTZVICE-c3ec94'},{isActive:false},{paymentToken:'BONEZ'},{paymentTokenNonce:1},{price:'1.54'},{quantity:0},{offerId:NaN}])assert.equal(normalizeXoxnoOffers({resources:[{...offer,...change}]},collection).length,0);
 assert.throws(()=>normalizeXoxnoOffers({},collection));
});
test('proxy rejects mutations and unsupported collections before fetching',async()=>{assert.equal((await handler({httpMethod:'POST'})).statusCode,405);assert.equal((await handler({httpMethod:'GET',queryStringParameters:{collection:'FAKE'}})).statusCode,400);});
test('proxy preserves pagination and separates outages from no offers',async()=>{const saved=global.fetch;try{
 global.fetch=async url=>{const f=JSON.parse(new URL(url).searchParams.get('filter'));assert.deepEqual(f.filters.marketplace,['xoxno']);assert.deepEqual(f.filters.collection,[collection]);return Response.json({resources:[offer],hasMoreResults:true,continuationToken:'page-two'});};const r=await handler({httpMethod:'GET',queryStringParameters:{collection}});assert.equal(r.statusCode,200);assert.equal(JSON.parse(r.body).continuationToken,'page-two');
 global.fetch=async()=>Response.json({resources:[],hasMoreResults:false});assert.deepEqual(JSON.parse((await handler({httpMethod:'GET',queryStringParameters:{collection}})).body).offers,[]);
 global.fetch=async()=>{throw Error('offline');};assert.equal((await handler({httpMethod:'GET',queryStringParameters:{collection}})).statusCode,502);
 }finally{global.fetch=saved;}});
test('offer-type filters reach XOXNO and reject unknown types',async()=>{const saved=global.fetch;try{for(const type of ['all','global','traits']){global.fetch=async url=>{const f=JSON.parse(new URL(url).searchParams.get('filter'));assert.equal(f.filters.withAttributes,type==='all'?undefined:type==='traits');return Response.json({resources:[],hasMoreResults:false});};assert.equal((await handler({httpMethod:'GET',queryStringParameters:{collection,type}})).statusCode,200);}assert.equal((await handler({httpMethod:'GET',queryStringParameters:{collection,type:'wrong'}})).statusCode,400);}finally{global.fetch=saved;}});
