import test from 'node:test';
import assert from 'node:assert/strict';
import {portfolioInput,PORTFOLIO_LIMIT} from '../shared/market-portfolio.mjs';
import {handler} from '../netlify/functions/market-portfolio.mjs';
const shopId='c45e7833-10da-4cc6-b05f-7fe76ae0c139',other='08ac0862-5668-4b9b-ae88-d0dd880e058f';
const shop={id:shopId,booth_number:1,access_status:'test',owner_wallet:'owner',moderation_suspended:false};
const input={slot:1,title:'Hand-tufted rug',caption:'A previous commission.',image_path:shopId+'/'+other+'.jpg',status:'published'};
const origin='https://thepittzstop.com';
function event(route='public',body,extra={}){return {rawUrl:origin+'/.netlify/functions/market-portfolio',httpMethod:body?'POST':'GET',headers:{origin,'content-type':'application/json',cookie:'__Host-pittz-market='+'a'.repeat(64)},queryStringParameters:{route,booth:'1',slot:'1'},...(body?{body:JSON.stringify(body)}:{}),...extra};}
async function using(fetcher,run){const saved=global.fetch,url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;process.env.SUPABASE_URL='https://xqdrecxqkldhznydglev.supabase.co';process.env.SUPABASE_SECRET_KEY='test';global.fetch=fetcher;try{await run();}finally{global.fetch=saved;if(url===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=url;if(key===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=key;}}
function auth(url){if(url.includes('/market_sessions?'))return Response.json([{shop_id:shopId,wallet_address:'owner'}]);if(url.includes('/market_shops?'))return Response.json([shop]);}
test('six gallery spaces are enforced and photos must belong to the merchant',()=>{
 assert.equal(PORTFOLIO_LIMIT,6);assert.equal(portfolioInput(input,shopId).title,input.title);
 for(const change of [{slot:0},{slot:7},{slot:1.5},{title:''},{title:'a'.repeat(121)},{caption:'a'.repeat(1501)},{status:'sale'},{image_path:other+'/'+other+'.jpg'},{image_path:shopId+'/../x.jpg'}])assert.throws(()=>portfolioInput({...input,...change},shopId),{status:400});
});
test('public gallery requests only published work and never exposes storage paths',async()=>using(async url=>{
 if(url.includes('/market_shops?'))return Response.json([shop]);
 const u=new URL(url);assert.equal(u.searchParams.get('status'),'eq.published');assert.equal(u.searchParams.get('shop_id'),'eq.'+shopId);assert.equal(u.searchParams.get('limit'),'6');assert(!u.searchParams.get('select').includes('image_path'));return Response.json([{slot:1,title:'Past work',caption:'Made by hand',updated_at:'2026-10-24'}]);
},async()=>{const r=await handler(event());assert.equal(r.statusCode,200);const d=JSON.parse(r.body);assert.equal(d.items.length,1);assert(d.items[0].image_url.includes('route=image&booth=1&slot=1'));assert(!r.body.includes(shopId));}));
test('suspended and expired stores cannot expose past work',async()=>{
 for(const entry of [{...shop,moderation_suspended:true},{...shop,access_status:'active',rental_expires_at:'2020-01-01'}])await using(async()=>Response.json([entry]),async()=>assert.equal((await handler(event())).statusCode,404));
});
test('gallery writes require session, origin, and an owned photo',async()=>{
 await using(async()=>{throw Error('No database access expected');},async()=>{
 assert.equal((await handler(event('save',input,{headers:{}}))).statusCode,403);
 assert.equal((await handler(event('save',input,{headers:{origin,'content-type':'application/json'}}))).statusCode,401);
 });
 await using(async url=>{const r=auth(url);if(r)return r;throw Error('No writes expected');},async()=>assert.equal((await handler(event('save',{...input,image_path:other+'/'+other+'.jpg'}))).statusCode,400));
});
test('save scopes the upsert to the authenticated shop and removal cannot delete another shop',async()=>using(async(url,options)=>{
 const r=auth(url);if(r)return r;
 const u=new URL(url);if(options.method==='POST'){const body=JSON.parse(options.body);assert.equal(body.shop_id,shopId);assert.equal(body.slot,1);assert.equal(u.searchParams.get('on_conflict'),'shop_id,slot');return new Response(null,{status:204});}
 assert.equal(options.method,'DELETE');assert.equal(u.searchParams.get('shop_id'),'eq.'+shopId);assert.equal(u.searchParams.get('slot'),'eq.1');return new Response(null,{status:204});
},async()=>{assert.equal((await handler(event('save',{...input,shop_id:other}))).statusCode,200);assert.equal((await handler(event('remove',{slot:1,shop_id:other}))).statusCode,200);}));
test('private draft images require the owning session before signing a storage URL',async()=>using(async url=>{
 if(url.includes('/market_shops?'))return Response.json([shop]);
 if(url.includes('/market_portfolio?'))return Response.json([{...input,status:'draft'}]);
 throw Error('Must not sign storage without owner session');
},async()=>assert.equal((await handler(event('image',undefined,{headers:{}}))).statusCode,401)));
test('image redirect signs only validated owned paths',async()=>using(async url=>{
 if(url.includes('/market_shops?'))return Response.json([shop]);
 if(url.includes('/market_portfolio?'))return Response.json([input]);
 assert(url.endsWith('/market-product-images/'+input.image_path));return Response.json({signedURL:'/object/sign/market-product-images/'+input.image_path+'?token=short-lived'});
},async()=>{const r=await handler(event('image'));assert.equal(r.statusCode,302);assert(r.headers.Location.startsWith('https://xqdrecxqkldhznydglev.supabase.co/storage/v1/'));}));
