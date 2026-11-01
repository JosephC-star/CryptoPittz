import test from 'node:test';
import assert from 'node:assert/strict';
import {requestOrigin} from '../netlify/functions/market-api.mjs';
test('Back Booth preview and production are accepted origins',()=>{
 for(const origin of ['https://deploy-preview-57--cryptopittz.netlify.app','https://thepittzstop.com'])assert.equal(requestOrigin({rawUrl:origin+'/.netlify/functions/market-admin?route=me'}),origin);
});
test('unrelated and lookalike origins remain rejected',()=>{
 for(const rawUrl of ['https://example.com/','https://deploy-preview-57--cryptopittz.netlify.app.example.com/','http://thepittzstop.com/','invalid'])assert.throws(()=>requestOrigin({rawUrl}),e=>e.status===403);
});
import {handler as support} from '../netlify/functions/market-support.mjs';
test('booth edits, uploads, resets and history still require an admin session',async()=>{
 const origin='https://deploy-preview-57--cryptopittz.netlify.app';
 for(const route of ['edit','photo','clear','history']){
  const result=await support({rawUrl:origin+'/.netlify/functions/market-support?route='+route,queryStringParameters:{route},httpMethod:route==='history'?'GET':'POST',headers:{origin,'content-type':'application/json'},body:route==='history'?undefined:JSON.stringify({booth:1})});
  assert.equal(result.statusCode,401,route);
 }
});
