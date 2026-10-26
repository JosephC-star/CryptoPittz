import {normalizeXoxnoOffers,supportedCollections} from '../../src/features/xoxno/collectionOffers.mjs';
export async function handler(event){
 const reply=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)});
 if(event.httpMethod!=='GET')return reply(405,{error:'GET only.'});
 const {collection,continuationToken}=event.queryStringParameters||{};
 if(!supportedCollections.includes(collection)||continuationToken&& (typeof continuationToken!=='string'||continuationToken.length>8000))return reply(400,{error:'Invalid collection or page.'});
 const filter={top:100,filters:{collection:[collection],marketplace:['xoxno'],isActive:true}};
 const params=new URLSearchParams({filter:JSON.stringify(filter),...(continuationToken?{continuationToken}:{})});
 try{
  const r=await fetch('https://api.xoxno.com/collection/global-offer/query?'+params,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Unavailable');const data=await r.json();
  const offers=normalizeXoxnoOffers(data,collection);if(data.hasMoreResults===true&&(typeof data.continuationToken!=='string'||!data.continuationToken||data.continuationToken.length>8000))throw Error('Invalid next page');
  return reply(200,{offers,hasMore:data.hasMoreResults===true,continuationToken:data.hasMoreResults===true?data.continuationToken:null});
 }catch{return reply(502,{error:'XOXNO offers unavailable. Try again.'});}
}
