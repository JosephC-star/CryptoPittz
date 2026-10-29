import test from 'node:test';import assert from 'node:assert/strict';
import {handler} from '../netlify/functions/pittz-owner.mjs';
const address='erd1kdj4sqwmactlqf30wasuhzf7glgna328mrtf20e3c94z8z24pmsqsdk3pr',identifier='PITTZ-1a4c2d-01',escrow='erd1qqqqqqqqqqqqqpgqwp73w2a9eyzs64eltupuz3y3hv798vlv899qrjnflg';
test('owner lookup rejects invalid identifiers, invalid checksum and writes',async()=>{assert.equal((await handler({httpMethod:'POST'})).statusCode,405);for(const queryStringParameters of [{identifier:'OTHER-123456-01'},{address:'erd1bad'}])assert.equal((await handler({httpMethod:'GET',queryStringParameters})).statusCode,400);});
test('wallet owner comes from exact live NFT, with public name optional',async()=>{const saved=global.fetch;try{global.fetch=async url=>{if(url.includes('/nfts/'))return Response.json({identifier,owner:address});if(url.includes('api.multiversx.com/accounts/'))return Response.json({address,username:'pack.elrond'});return new Response('',{status:404});};const r=await handler({httpMethod:'GET',queryStringParameters:{identifier}});assert.equal(r.statusCode,200);assert.deepEqual(JSON.parse(r.body),{address,role:'owner',custodian:null,name:'pack.elrond',avatar:null});}finally{global.fetch=saved;}});
test('unresolved escrow is custody, never presented as a collector owner',async()=>{const saved=global.fetch;try{global.fetch=async url=>url.includes('/nfts/')?Response.json({identifier,owner:escrow}):new Response('',{status:503});const r=await handler({httpMethod:'GET',queryStringParameters:{identifier}});assert.equal(r.statusCode,200);assert.equal(JSON.parse(r.body).role,'custody');}finally{global.fetch=saved;}});
test('mismatched NFT response is an error instead of a guessed owner',async()=>{const saved=global.fetch;try{global.fetch=async()=>Response.json({identifier:'PITTZ-1a4c2d-02',owner:address});assert.equal((await handler({httpMethod:'GET',queryStringParameters:{identifier}})).statusCode,502);}finally{global.fetch=saved;}});

// Captured OOX auction 12051: exact collection, nonce and original seller.
const ooxAuction="AAAADFBJVFRaLTFhNGMyZAAAAAAAAAKEAAAAAQEBAAAAAAAALxMAAAAERUdMRAAAAAAAAAAAAAAACBpeJ+7xPgAAAQAAAAgaXifu8T4AAAAAAAAAAAAAaqmkgwAAAABsitfysvkQEpm+aqhbQvEQljp907n/qhwFSgkfgzFm3TXeLBQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABZAAAAAID6A==";
for(const mismatch of [false,true])test('OOX seller is resolved from its own feed; mismatched escrow stays custody '+mismatch,async()=>{
 const saved=global.fetch,id='PITTZ-1a4c2d-'+(mismatch?'0285':'0284');
 try{
 global.fetch=async url=>{
 if(url.includes('/nfts/'))return Response.json({identifier:id,collection:'PITTZ-1a4c2d',owner:escrow});
 if(url.includes('www.oox.art'))return Response.json([{identifier:id,auctionInfo:{marketplace:'oox',auctionId:12051}}]);
 if(url.includes('/vm-values/query'))return Response.json({code:'successful',data:{data:{returnCode:'ok',returnData:[ooxAuction]}}});
 if(url.includes('/accounts/'))return Response.json({address:url.split('/').at(-1)});
 return new Response('',{status:404});
 };
 const r=JSON.parse((await handler({httpMethod:'GET',queryStringParameters:{identifier:id}})).body);
 assert.equal(r.role,mismatch?'custody':'seller');
 assert.equal(r.address,mismatch?escrow:'erd1ktu3qy5ehe42sk6z7ygfvwna6wull2suq49qj8urx9nd6dw79s2qn5qqea');
 }finally{global.fetch=saved;}
});
