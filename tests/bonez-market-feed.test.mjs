import test from 'node:test';
import assert from 'node:assert/strict';
import {marketPair, handler} from '../netlify/functions/bonez-market.mjs';
import {BONEZ_PAIR_ADDRESS} from '../src/config/collections.js';
const fixture = {address:BONEZ_PAIR_ADDRESS,id:'BONEZWEGLD-c5db6b',baseId:'BONEZ-ff9a73',quoteId:'WEGLD-bd4d79',exchange:'xexchange',state:'active',basePrice:0.00011,quotePrice:4,totalValue:5700,volume24h:0,basePrevious24hPrice:0.0001};
test('market data uses token price, not LP-token price, and preserves real zero volume',()=>{
  const pair=marketPair({...fixture,price:123456789});
  assert.equal(pair.priceUsd,0.00011);assert.equal(pair.priceNative,0.00011/4);assert.equal(pair.volume.h24,0);assert.equal(pair.liquidity.usd,5700);assert(Math.abs(pair.priceChange.h24-10)<0.00001);assert.equal(pair.marketCap,undefined);assert.equal(pair.txns,undefined);
});
test('wrong pair identities and invalid prices are rejected',()=>{
  for(const patch of [{address:'other'},{baseId:'OTHER-token'},{quoteId:'OTHER-token'},{state:'inactive'},{basePrice:NaN},{quotePrice:0}])assert.throws(()=>marketPair({...fixture,...patch}));
  const pair=marketPair({...fixture,volume24h:undefined,totalValue:undefined,basePrevious24hPrice:0});assert.equal(pair.volume,undefined);assert.equal(pair.liquidity,undefined);assert.equal(pair.priceChange,undefined);
});
test('feed returns cacheable verified data and safe failures',async()=>{
  const original=globalThis.fetch;
  try {
    globalThis.fetch=async url=>{assert.equal(url,'https://api.multiversx.com/mex/pairs/BONEZ-ff9a73/WEGLD-bd4d79');return Response.json(fixture);};
    const result=await handler({httpMethod:'GET'});assert.equal(result.statusCode,200);assert.match(result.headers['Cache-Control'],/s-maxage=60/);assert.equal(JSON.parse(result.body).pair.priceUsd,fixture.basePrice);
    globalThis.fetch=async()=>new Response('',{status:429});assert.equal((await handler({httpMethod:'GET'})).statusCode,502);
    assert.equal((await handler({httpMethod:'POST'})).statusCode,405);
  } finally {globalThis.fetch=original;}
});
