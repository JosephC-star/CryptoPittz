import test from 'node:test';
import assert from 'node:assert/strict';
import { handler } from '../netlify/functions/pittz-artwork.mjs';

test('GIF artwork rejects arbitrary URLs and unrelated collections', async () => {
  for (const identifier of ['https://example.com/private', 'OTHER-abcdef-01', undefined]) {
    assert.equal((await handler({ httpMethod: 'GET', queryStringParameters: { identifier } })).statusCode, 400);
  }
});

test('GIF artwork returns binary artwork from the official media host', async () => {
  const original = globalThis.fetch;
  const identifier = 'PITTZ-1a4c2d-01';
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return calls.length === 1
      ? Response.json({ identifier, media: [{ thumbnailUrl: 'https://media.multiversx.com/nfts/thumbnail/test' }] })
      : new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } });
  };
  try {
    const result = await handler({ httpMethod: 'GET', queryStringParameters: { identifier } });
    assert.equal(result.statusCode, 200);
    assert.equal(result.isBase64Encoded, true);
    assert.equal(result.body, 'AQID');
    assert.equal(calls.length, 2);
  } finally { globalThis.fetch = original; }
});

test('GIF artwork refuses media URLs outside the approved host', async () => {
  const original = globalThis.fetch;
  const identifier = 'PITTZVICE-c3ec94-01';
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ identifier, media: [{ url: 'https://127.0.0.1/private' }] }); };
  try {
    assert.equal((await handler({ httpMethod: 'GET', queryStringParameters: { identifier } })).statusCode, 502);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});


test('Reveal exports prefer the original official artwork over its thumbnail', async () => {
 const original=globalThis.fetch,identifier='PITTZ-1a4c2d-01',calls=[];
 globalThis.fetch=async url=>{calls.push(String(url));return calls.length===1?Response.json({identifier,media:[{url:'https://media.multiversx.com/nfts/asset/full.png',thumbnailUrl:'https://media.multiversx.com/nfts/thumbnail/small',fileType:'image/png'}]}):new Response(new Uint8Array([1]),{headers:{'content-type':'image/png'}});};
 try{assert.equal((await handler({httpMethod:'GET',queryStringParameters:{identifier}})).statusCode,200);assert.equal(calls[1],'https://media.multiversx.com/nfts/asset/full.png');}finally{globalThis.fetch=original;}
});
