import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewInput} from '../shared/market-reviews.mjs';
import {handler} from '../netlify/functions/market-reviews.mjs';
import {handler as adminHandler} from '../netlify/functions/market-admin.mjs';
const origin='https://thepittzstop.com',shopId='c45e7833-10da-4cc6-b05f-7fe76ae0c139',id='08ac0862-5668-4b9b-ae88-d0dd880e058f';
const input={name:'Pack friend',comment:'Great communication and helpful service.',rating:5,consent:true,request_id:id,booth:1};
const shop={id:shopId,access_status:'test',moderation_suspended:false};
function event(body,query={},headers={}){return {rawUrl:origin+'/.netlify/functions/market-reviews',httpMethod:body===undefined?'GET':'POST',headers:{origin,'content-type':'application/json','x-nf-client-connection-ip':'203.0.113.8',...headers},queryStringParameters:{booth:'1',...query},...(body===undefined?{}:{body:JSON.stringify(body)})};}
async function using(fetcher,run){const saved=global.fetch;const oldUrl=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_SECRET_KEY;process.env.SUPABASE_URL='https://xqdrecxqkldhznydglev.supabase.co';process.env.SUPABASE_SECRET_KEY='test-only-key';global.fetch=fetcher;try{await run();}finally{global.fetch=saved;if(oldUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=oldKey;}}
test('reviews require whole-number ratings, bounded text and publication consent',()=>{
 assert.equal(reviewInput(input).rating,5);assert.equal(reviewInput({...input,rating:1}).rating,1);
 for(const fields of [{rating:0},{rating:6},{rating:3.5},{rating:'5'},{name:'x'},{comment:'short'},{comment:'x'.repeat(1501)},{consent:false},{website:'spam'}])assert.throws(()=>reviewInput({...input,...fields}),{status:400});
});
test('public reviews are scoped, paginated and never request private submitter hashes',async()=>using(async(url,options)=>{
 const u=new URL(url);if(u.pathname.endsWith('/market_shops'))return Response.json([shop]);
 if(u.pathname.endsWith('/market_reviews')){assert.equal(u.searchParams.get('shop_id'),'eq.'+shopId);assert.equal(u.searchParams.get('status'),'eq.published');assert.equal(u.searchParams.get('offset'),'10');assert(!u.searchParams.get('select').includes('client_hash'));return Response.json(Array.from({length:11},(_,n)=>({id:n,rating:4,display_name:'Friend',comment:'Good shop experience.'})));}
 assert(u.pathname.endsWith('/market_review_summary'));assert.equal(JSON.parse(options.body).shop_key,shopId);return Response.json({count:21,average:4.2});
},async()=>{const r=await handler(event(undefined,{offset:'10'}));assert.equal(r.statusCode,200);const d=JSON.parse(r.body);assert.equal(d.reviews.length,10);assert.equal(d.hasMore,true);assert.equal(d.count,21);assert.equal(d.average,4.2);}));
test('submissions use trusted hashed IP and atomic pending-review RPC',async()=>using(async(url,options)=>{
 if(url.includes('/market_shops?'))return Response.json([shop]);
 assert(url.endsWith('/rpc/market_submit_review'));const b=JSON.parse(options.body);assert.equal(b.review_id,id);assert.equal(b.shop_key,shopId);assert.equal(b.score,5);assert.match(b.client_hash,/^[0-9a-f]{64}$/);assert(!JSON.stringify(b).includes('203.0.113.8'));assert(!('status' in b));return Response.json(true);
},async()=>{assert.equal((await handler(event(input))).statusCode,200);}));
test('cross-origin, missing trusted client IP, inactive shops and limits reject submissions',async()=>{
 await using(async url=>{assert(url.includes('/market_shops?'));return Response.json([shop]);},async()=>{
 assert.equal((await handler(event(input,{}, {origin:'https://other.example'}))).statusCode,403);
 assert.equal((await handler(event(input,{}, {'x-nf-client-connection-ip':''}))).statusCode,503);
 assert.equal((await handler(event({...input,rating:8}))).statusCode,400);
 });
 await using(async()=>Response.json([{...shop,moderation_suspended:true}]),async()=>assert.equal((await handler(event(input))).statusCode,404));
 await using(async url=>Response.json(url.includes('/market_shops?')?[shop]:false),async()=>assert.equal((await handler(event(input))).statusCode,429));
});
test('review admin routes require an active admin session',async()=>using(async()=>{throw Error('Should not reach storage without admin cookie');},async()=>{
 assert.equal((await adminHandler(event(undefined,{route:'reviews'}))).statusCode,401);
 assert.equal((await adminHandler(event({id,action:'published',reason:'Valid feedback'},{route:'review-moderate'}))).statusCode,401);
}));
test('review moderation records the authenticated admin and validates action and reason',async()=>using(async(url,options)=>{
 if(url.includes('/market_admin_sessions?'))return Response.json([{id,wallet_address:'admin-wallet'}]);
 if(url.includes('/market_admins?'))return Response.json([{wallet_address:'admin-wallet'}]);
 assert(url.endsWith('/rpc/market_moderate_review'));assert.deepEqual(JSON.parse(options.body),{actor:'admin-wallet',target:id,next_status:'published',explanation:'Valid community feedback'});return Response.json({saved:true});
},async()=>{
 const headers={cookie:'__Host-pittz-market-admin='+'a'.repeat(64)};
 assert.equal((await adminHandler(event({id,action:'published',reason:'Valid community feedback'},{route:'review-moderate'},headers))).statusCode,200);
 assert.equal((await adminHandler(event({id,action:'delete',reason:'Valid community feedback'},{route:'review-moderate'},headers))).statusCode,400);
 assert.equal((await adminHandler(event({id,action:'hidden',reason:'no'},{route:'review-moderate'},headers))).statusCode,400);
}));
