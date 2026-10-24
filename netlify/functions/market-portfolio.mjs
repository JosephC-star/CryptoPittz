import {db,request,requestOrigin,configuration,session,active,fail,response} from './market-api.mjs';
import {readJsonRequest} from '../../server/json-request.mjs';
import {portfolioInput,PORTFOLIO_LIMIT} from '../../shared/market-portfolio.mjs';
const imageUrl=(booth,slot)=>'/.netlify/functions/market-portfolio?route=image&booth='+booth+'&slot='+slot;
export async function handler(event){try{
 const origin=requestOrigin(event),route=event.queryStringParameters?.route||'public';
 if(!['public','mine','save','remove','image'].includes(route))fail(404,'Unknown gallery action.');
 const writing=['save','remove'].includes(route);
 if(event.httpMethod!==(writing?'POST':'GET'))fail(405,'Unsupported request method.');
 if(writing&&event.headers?.origin!==origin)fail(403,'Open your merchant backroom to make this change.');
 if(writing&&!event.headers?.['content-type']?.startsWith('application/json'))fail(415,'JSON required.');
 if(route==='mine'||writing){
  const {shop}=await session(event);
  if(route==='mine'){
   const items=await db('market_portfolio?shop_id=eq.'+shop.id+'&select=slot,title,caption,status,image_path,updated_at&order=slot.asc&limit='+PORTFOLIO_LIMIT);
   return response(200,{items:items.map(item=>({...item,image_url:imageUrl(shop.booth_number,item.slot)+'&v='+encodeURIComponent(item.updated_at)}))});
  }
  const body=readJsonRequest(event,12000,'This gallery entry is too large.');
  if(route==='save'){
   const item=portfolioInput(body,shop.id);
   await db('market_portfolio?on_conflict=shop_id,slot','POST',{...item,shop_id:shop.id,updated_at:new Date().toISOString()},{Prefer:'resolution=merge-duplicates'});
   return response(200,{saved:true});
  }
  const slot=Number(body.slot);if(!Number.isInteger(slot)||slot<1||slot>PORTFOLIO_LIMIT)fail(400,'Invalid gallery slot.');
  await db('market_portfolio?shop_id=eq.'+shop.id+'&slot=eq.'+slot,'DELETE');
  return response(200,{removed:true});
 }
 const booth=Number(event.queryStringParameters?.booth);
 if(!Number.isSafeInteger(booth)||booth<1)fail(400,'Choose a valid booth.');
 const shops=await db('market_shops?booth_number=eq.'+booth+'&select=id,access_status,rental_expires_at,moderation_suspended&limit=1'),shop=shops?.[0];
 if(!active(shop))fail(404,'This shop is not available.');
 if(route==='public'){
  const items=await db('market_portfolio?shop_id=eq.'+shop.id+'&status=eq.published&select=slot,title,caption,updated_at&order=slot.asc&limit='+PORTFOLIO_LIMIT);
  return response(200,{items:items.map(item=>({...item,image_url:imageUrl(booth,item.slot)+'&v='+encodeURIComponent(item.updated_at)}))});
 }
 const slot=Number(event.queryStringParameters?.slot);if(!Number.isInteger(slot)||slot<1||slot>PORTFOLIO_LIMIT)fail(400,'Invalid gallery picture.');
 const rows=await db('market_portfolio?shop_id=eq.'+shop.id+'&slot=eq.'+slot+'&select=slot,title,caption,status,image_path&limit=1'),item=rows?.[0];
 if(!item)fail(404,'Gallery picture not found.');
 if(item.status!=='published'){const auth=await session(event);if(auth.shop.id!==shop.id)fail(404,'Gallery picture not found.');}
 portfolioInput(item,shop.id);
 const signed=await request('/storage/v1/object/sign/market-product-images/'+item.image_path,'POST',{expiresIn:60});
 const location=new URL('/storage/v1'+signed.signedURL,configuration().origin);
 if(location.origin!==configuration().origin)fail(503,'Picture could not be opened.');
 return response(302,{}, {Location:location.href});
}catch(error){return response(error.status||503,{error:error.status&&error.status!==503?error.message:'The past-work gallery could not load. Please try again shortly.'});}}
