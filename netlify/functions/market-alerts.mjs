import {randomInt} from 'node:crypto';
import {session,db,requestOrigin,response,fail,hash} from './market-api.mjs';
import {readJsonRequest} from '../../server/json-request.mjs';
import {emailAddress,mailReady,sendMarketMail} from '../../server/market-email.mjs';
export async function handler(event){try{
 const origin=requestOrigin(event),route=event.queryStringParameters?.route||'settings';
 if(!['settings','start','verify','disable'].includes(route))fail(404,'Unknown alert action.');
 if(event.httpMethod!==(route==='settings'?'GET':'POST'))fail(405,'Unsupported request method.');
 if(route!=='settings'&&(event.headers?.origin!==origin||!event.headers?.['content-type']?.startsWith('application/json')))fail(403,'Open email settings from your backroom.');
 const {shop}=await session(event),body=readJsonRequest(event,4096);
 if(route==='settings'){
  if(!mailReady())return response(200,{configured:false,settings:{enabled:false}});
  const rows=await db('market_alert_contacts?shop_id=eq.'+shop.id+'&owner_wallet=eq.'+shop.owner_wallet+'&select=email,enabled,verified_at,pending_email,pending_expires_at&limit=1');
  return response(200,{configured:mailReady(),settings:rows[0]||{enabled:false}});
 }
 if(route==='disable'){
  await db('market_alert_contacts?shop_id=eq.'+shop.id+'&owner_wallet=eq.'+shop.owner_wallet,'PATCH',{enabled:false,pending_hash:null,pending_email:null,pending_expires_at:null});
  return response(200,{disabled:true});
 }
 if(!mailReady())fail(503,'Email alerts are not configured yet. Your inquiries remain in your backroom.');
 if(route==='start'){
  let email;try{email=emailAddress(body.email);}catch(error){fail(400,error.message);}
  const code=String(randomInt(10000000,100000000)),codeHash=hash(shop.id+'|'+shop.owner_wallet+'|'+code);
  if(!await db('rpc/market_start_alert_verification','POST',{shop_key:shop.id,wallet_key:shop.owner_wallet,email_value:email,code_hash:codeHash}))fail(429,'Wait a minute before requesting another code. Up to five requests are allowed each day.');
  await sendMarketMail(email,'Confirm your PittzStop shop alerts','Your verification code is '+code+'.\n\nEnter it in your merchant backroom within 15 minutes. This enables new-inquiry alerts. If you did not request this, ignore this email.','market-verify/'+codeHash);
  return response(200,{sent:true,message:'Check your email and enter the eight-digit code.'});
 }
 if(!/^\d{8}$/.test(body.code||''))fail(400,'Enter the eight-digit email code.');
 const verified=await db('rpc/market_verify_alert_email','POST',{shop_key:shop.id,wallet_key:shop.owner_wallet,code_hash:hash(shop.id+'|'+shop.owner_wallet+'|'+body.code)});
 if(!verified)fail(400,'Code incorrect, expired, or already used. Request a new code after five attempts.');
 return response(200,{verified:true});
}catch(error){return response(error.status||503,{error:error.status?error.message:'Email settings are temporarily unavailable. Your inquiries are still saved.'});}}
