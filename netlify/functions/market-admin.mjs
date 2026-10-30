import {readJsonRequest} from '../../server/json-request.mjs';
import { randomBytes, randomUUID } from 'node:crypto';
import { wallet, validSignature, loginMessage, db, request, configuration, requestOrigin, hash, fail, response, now } from './market-api.mjs';

const COOKIE='__Host-pittz-market-admin';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const cookie=(token,age=3600)=>COOKIE+'='+token+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age='+age;
export function adminMessage(challenge,nonce){return loginMessage(challenge,nonce).replace('Merchant sign-in','Admin moderation sign-in').replace('Sign in to manage your assigned booth.','Sign in to moderate marketplace stores and listings.');}
async function admin(address){const rows=await db('market_admins?wallet_address=eq.'+encodeURIComponent(address)+'&active=eq.true&select=wallet_address,display_name&limit=1');if(!rows?.[0])fail(403,'This wallet is not an active market administrator.');return rows[0];}
async function session(event){const token=(event.headers?.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);if(!token||!/^[0-9a-f]{64}$/.test(token))fail(401,'Sign in with an assigned admin wallet.');const rows=await db('market_admin_sessions?token_hash=eq.'+hash(requestOrigin(event)+'|admin|'+token)+'&revoked_at=is.null&expires_at=gt.'+encodeURIComponent(now())+'&select=*&limit=1');if(!rows?.[0])fail(401,'Your admin session expired. Sign in again.');return {session:rows[0],admin:await admin(rows[0].wallet_address)};}
export async function handler(event){try{
  const origin=requestOrigin(event),route=event.queryStringParameters?.route||'me';
  const methods={me:'GET',challenge:'POST',verify:'POST',logout:'POST',shops:'GET',products:'GET',audit:'GET',moderate:'POST',image:'GET',reviews:'GET','review-history':'GET','review-moderate':'POST'};
  if(!methods[route])fail(404,'Unknown admin action.');if(event.httpMethod!==methods[route])fail(405,'Unsupported request method.');
  if(event.httpMethod!=='GET'&&event.headers?.origin!==origin)fail(403,'Open this action from the market admin page.');
  if(event.httpMethod!=='GET'&&!event.headers?.['content-type']?.startsWith('application/json'))fail(415,'JSON required.');
  const body=readJsonRequest(event,12000,'This admin request is too large.');
  if(route==='challenge'){
    const address=wallet(body.address);await admin(address);
    const recent=await db('market_login_challenges?wallet_address=eq.'+address+'&created_at=gt.'+encodeURIComponent(new Date(Date.now()-60000).toISOString())+'&select=id&limit=5');
    if(recent.length>=5)fail(429,'Wait a minute before requesting another login message.');
    const nonce=randomBytes(32).toString('hex'),challenge={id:randomUUID(),wallet_address:address,nonce_hash:hash('admin:'+nonce),origin,expires_at:new Date(Date.now()+300000).toISOString()};
    await db('market_login_challenges','POST',challenge);return response(200,{id:challenge.id,nonce,message:adminMessage(challenge,nonce)});
  }
  if(route==='verify'){
    if(!UUID.test(body.id)||!/^[0-9a-f]{64}$/.test(body.nonce))fail(400,'Invalid admin login challenge.');
    const rows=await db('market_login_challenges?id=eq.'+body.id+'&used_at=is.null&expires_at=gt.'+encodeURIComponent(now())+'&select=*&limit=1'),challenge=rows?.[0];
    if(!challenge||challenge.origin!==origin||challenge.nonce_hash!==hash('admin:'+body.nonce))fail(401,'Admin login message expired or was already used.');
    if(!await validSignature(challenge.wallet_address,adminMessage(challenge,body.nonce),body.signature))fail(401,'Admin wallet signature could not be verified.');
    const identity=await admin(challenge.wallet_address);
    const consumed=await db('market_login_challenges?id=eq.'+body.id+'&used_at=is.null&expires_at=gt.'+encodeURIComponent(now())+'&select=id','PATCH',{used_at:now()},{Prefer:'return=representation'});
    if(consumed?.length!==1)fail(401,'This login message has already been used.');
    const token=randomBytes(32).toString('hex');await db('market_admin_sessions','POST',{wallet_address:identity.wallet_address,token_hash:hash(origin+'|admin|'+token),expires_at:new Date(Date.now()+3600000).toISOString()});
    return response(200,{admin:identity},{'Set-Cookie':cookie(token)});
  }
  const auth=await session(event);
  if(route==='me')return response(200,{admin:auth.admin});
  if(route==='logout'){await db('market_admin_sessions?id=eq.'+auth.session.id,'PATCH',{revoked_at:now()});return response(200,{signedOut:true},{'Set-Cookie':cookie('',0)});}
  const offset=Number(event.queryStringParameters?.offset||0);if(!Number.isSafeInteger(offset)||offset<0||offset>100000)fail(400,'Invalid page.');
  if(route==='review-history'){
    const rows=await db('market_review_actions?select=id,review_id,actor_wallet,previous_status,new_status,reason,created_at&order=created_at.desc,id.desc&limit=51&offset='+offset);
    return response(200,{'review-history':rows.slice(0,50).map(row=>({...row,action:row.previous_status+' → '+row.new_status,target_type:'review',target_id:row.review_id})),hasMore:rows.length>50});
  }
  if(route==='reviews'){
    const rows=await db('market_reviews?select=id,shop_id,display_name,rating,comment,status,created_at,shop:market_shops(name,booth_number)&order=created_at.desc,id.desc&limit=51&offset='+offset);
    return response(200,{reviews:rows.slice(0,50),hasMore:rows.length>50});
  }
  if(route==='review-moderate'){
    if(!UUID.test(body.id)||!['published','hidden'].includes(body.action))fail(400,'Invalid review action.');
    const reason=typeof body.reason==='string'?body.reason.trim():'';
    if(reason.length<5||reason.length>1000)fail(400,'Add a reason of 5 to 1000 characters.');
    const result=await db('rpc/market_moderate_review','POST',{actor:auth.admin.wallet_address,target:body.id,next_status:body.action,explanation:reason});
    return response(200,result);
  }
  if(route==='shops'){
    const rows=await db('market_shops?select=id,booth_number,name,owner_wallet,access_status,rental_expires_at,moderation_suspended,moderation_reason&order=booth_number.asc&limit=51&offset='+offset);
    return response(200,{shops:rows.slice(0,50),hasMore:rows.length>50});
  }
  if(route==='products'){
    const shop=event.queryStringParameters?.shop;if(shop&&!UUID.test(shop))fail(400,'Invalid shop.');
    const rows=await db('market_products?'+(shop?'shop_id=eq.'+shop+'&':'')+'select=id,shop_id,name,description,status,price,currency,image_path,moderation_hidden,moderation_reason&order=created_at.desc&limit=51&offset='+offset);
    return response(200,{products:rows.slice(0,50).map(p=>({...p,image_url:p.image_path?'/.netlify/functions/market-admin?route=image&product='+p.id:null})),hasMore:rows.length>50});
  }
  if(route==='audit'){const rows=await db('market_moderation_log?select=id,actor_wallet,target_type,target_id,action,reason,previous_state,new_state,created_at&order=created_at.desc&limit=51&offset='+offset);return response(200,{events:rows.slice(0,50),hasMore:rows.length>50});}
  if(route==='moderate'){
    if(!UUID.test(body.id)||!['shop','product'].includes(body.kind)||!(body.kind==='shop'?['suspend','reopen']:['hide','restore']).includes(body.action))fail(400,'Invalid moderation action.');
    const reason=typeof body.reason==='string'?body.reason.trim():'';if(reason.length<5||reason.length>1000)fail(400,'Add a reason of 5 to 1000 characters.');
    const result=await db('rpc/market_moderate','POST',{actor:auth.admin.wallet_address,kind:body.kind,target:body.id,action_name:body.action,explanation:reason});
    return response(200,result);
  }
  if(route==='image'){
    const id=event.queryStringParameters?.product;if(!UUID.test(id))fail(400,'Invalid product.');const rows=await db('market_products?id=eq.'+id+'&select=image_path,shop_id&limit=1');const p=rows?.[0];
    if(!p?.image_path||!p.image_path.startsWith(p.shop_id+'/')||p.image_path.includes('..'))fail(404,'Product image not found.');
    const signed=await request('/storage/v1/object/sign/market-product-images/'+p.image_path,'POST',{expiresIn:60});const location=new URL('/storage/v1'+signed.signedURL,configuration().origin);if(location.origin!==configuration().origin)fail(503,'Image could not be opened.');return response(302,{}, {Location:location.href});
  }
  fail(404,'Unknown admin action.');
}catch(error){return response(error.status||503,{error:error.status?error.message:'Market moderation is unavailable. Check the admin setup or refresh and try again.'});}}

export {session as adminSession};
