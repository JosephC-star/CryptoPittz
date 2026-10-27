import test from 'node:test';import assert from 'node:assert/strict';
import {fetchListedNfts} from '../src/features/dawg-pound/listedNfts.mjs';
const collection='PITTZ-1a4c2d';
test('fetches only listed NFT metadata in bounded batches, preserving images and input order',async()=>{
 const ids=Array.from({length:30},(_,i)=>collection+'-'+(i+1).toString(16).padStart(2,'0')),calls=[],progress=[];
 const rows=await fetchListedNfts(collection,[...ids,ids[0]],{onBatch:rows=>progress.push(rows.length),fetchImpl:async url=>{const p=new URL(url).searchParams,ids=p.get('identifiers').split(',');calls.push(ids.length);return Response.json(ids.reverse().map(identifier=>({identifier,collection,media:[{url:'https://example.com/pittz.png'}]})));}});
 assert.deepEqual(calls,[25,5]);assert.deepEqual(progress,[25,30]);assert.deepEqual(rows.map(n=>n.identifier),ids);assert.equal(rows[0].media[0].url,'https://example.com/pittz.png');
});
test('empty list makes no request; missing, unrelated and failed metadata responses are errors',async()=>{
 assert.deepEqual(await fetchListedNfts(collection,[],{fetchImpl:()=>{throw Error('must not fetch');}}),[]);
 for(const response of [()=>Response.json([]),()=>Response.json([{identifier:'PITTZVICE-c3ec94-01',collection:'PITTZVICE-c3ec94'}]),()=>new Response('',{status:503})])await assert.rejects(fetchListedNfts(collection,[collection+'-01'],{fetchImpl:response}));
});
