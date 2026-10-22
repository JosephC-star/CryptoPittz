import {isIP} from 'node:net';
import {db,requestOrigin,configuration,hash,active,fail,response} from './market-api.mjs';
import {readJsonRequest} from '../../server/json-request.mjs';
import {reviewInput} from '../../shared/market-reviews.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function handler(event){try{
 const origin=requestOrigin(event);
 if(!['GET','POST'].includes(event.httpMethod))fail(405,'Unsupported request method.');
 const writing=event.httpMethod==='POST';
 if(writing&&event.headers?.origin!==origin)fail(403,'Submit from the shop page.');
 if(writing&&!event.headers?.['content-type']?.startsWith('application/json'))fail(415,'JSON required.');
 const body=writing?readJsonRequest(event,8000,'This review is too large.'):{};
 const booth=Number(writing?body.booth:event.queryStringParameters?.booth);
 if(!Number.isSafeInteger(booth)||booth<1)fail(400,'Choose a valid booth.');
 const shops=await db('market_shops?booth_number=eq.'+booth+'&select=id,access_status,rental_expires_at,moderation_suspended&limit=1');
 if(!active(shops?.[0]))fail(404,'This shop is not available.');
 const shop=shops[0];
 if(writing){
  const review=reviewInput(body);
  if(!UUID.test(body.request_id))fail(400,'Refresh before submitting your review.');
  const ip=event.headers?.['x-nf-client-connection-ip'];
  if(!isIP(ip||''))fail(503,'Review submission could not be verified. Try again later.');
  const accepted=await db('rpc/market_submit_review','POST',{review_id:body.request_id,shop_key:shop.id,reviewer_name:review.name,review_text:review.comment,score:review.rating,client_hash:hash(configuration().headers.apikey+'|review-ip|'+ip)});
  if(accepted!==true)fail(429,'Review limit reached. Please try again tomorrow.');
  return response(200,{message:'Review received! An admin will check it before publication. Your rating counts once published.'});
 }
 const offset=Number(event.queryStringParameters?.offset||0);
 if(!Number.isSafeInteger(offset)||offset<0||offset>100000)fail(400,'Invalid page.');
 const [rows,summary]=await Promise.all([db('market_reviews?shop_id=eq.'+shop.id+'&status=eq.published&select=id,display_name,rating,comment,created_at&order=created_at.desc,id.desc&limit=11&offset='+offset),db('rpc/market_review_summary','POST',{shop_key:shop.id})]);
 return response(200,{reviews:rows.slice(0,10),hasMore:rows.length>10,...summary});
}catch(error){return response(error.status||503,{error:error.status&&error.status!==503?error.message:'Shop reviews are not available yet. Please check back soon.'});}}
