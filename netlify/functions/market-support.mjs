import {randomUUID} from 'node:crypto';
import {db,request,configuration,requestOrigin,response,fail,wallet,validSignature,imageInput,now} from './market-api.mjs';
import {adminSession} from './market-admin.mjs';
import {readJsonRequest} from '../../server/json-request.mjs';
import {supportMessage,verifiedPurchase} from '../../shared/support-purchase.mjs';
import {supportHistoryQuery} from '../../shared/support-history.mjs';
const scopeFor=origin=>origin.includes('deploy-preview-')?'preview':'live';
async function chain(path){const r=await fetch('https://api.multiversx.com'+path,{signal:AbortSignal.timeout(15000)});if(!r.ok)fail(503,'Chain confirmation is temporarily unavailable. Try again shortly.');return r.json();}
export async function handler(event){try{
 const origin=requestOrigin(event),scope=scopeFor(origin),route=event.queryStringParameters?.route||'booths';
 const methods={history:'GET',booths:'GET',board:'GET',image:'GET',record:'POST',edit:'POST',photo:'POST',clear:'POST'};
 if(!methods[route]||event.httpMethod!==methods[route])fail(405,'Unsupported request.');
 if(event.httpMethod==='POST'&&(event.headers?.origin!==origin||!event.headers?.['content-type']?.startsWith('application/json')))fail(403,'Open this action from the support room.');
 const body=readJsonRequest(event,route==='photo'?2900000:10000);
 if(route==='history'){await adminSession(event);let query;try{query=supportHistoryQuery(scope,event.queryStringParameters);}catch(e){fail(400,e.message);}const rows=await db(query);return response(200,{receipts:rows.slice(0,50),hasMore:rows.length>50});}
 const booth=Number(body.booth??event.queryStringParameters?.booth??1);if(![1,2].includes(booth))fail(400,'Choose a support booth.');
 const path='market_support_booths?scope=eq.'+scope+'&id=eq.'+booth;
 if(route==='booths'){const booths=await db('market_support_booths?scope=eq.'+scope+'&order=id.asc&select=id,title,description,image_path,updated_at');return response(200,{booths:booths.map(b=>({...b,image_url:b.image_path?'/.netlify/functions/market-support?route=image&booth='+b.id:null,image_path:undefined}))});}
 if(route==='board'){const offset=Number(event.queryStringParameters?.offset||0);if(!Number.isSafeInteger(offset)||offset<0||offset>100000)fail(400,'Invalid page.');const rows=await db('rpc/market_support_board','POST',{p_scope:scope,p_booth:booth,p_offset:offset});return response(200,{supporters:rows.slice(0,50),hasMore:rows.length>50});}
 if(route==='image'){const [b]=await db(path+'&select=image_path&limit=1');if(!b?.image_path?.startsWith(scope+'/'+booth+'/')||b.image_path.includes('..'))fail(404,'Picture unavailable.');const signed=await request('/storage/v1/object/sign/market-support-images/'+b.image_path,'POST',{expiresIn:300});const location=new URL('/storage/v1'+signed.signedURL,configuration().origin);if(location.origin!==configuration().origin)fail(503,'Picture unavailable.');return response(302,{}, {Location:location.href});}
 if(route==='record'){
  const address=wallet(body.address),hash=body.hash;if(typeof hash!=='string'||!/^[a-f0-9]{64}$/.test(hash)||typeof body.visible!=='boolean')fail(400,'Invalid receipt.');
  if(!await validSignature(address,supportMessage({origin,booth,hash,address,visible:body.visible}),body.signature))fail(401,'Approve the receipt message in the purchasing wallet.');
  const [existing]=await db('market_support_receipts?tx_hash=eq.'+hash+'&select=tx_hash,scope,booth_id&limit=1');
  if(existing){if(existing.scope!==scope||existing.booth_id!==booth)fail(409,'This purchase is already recorded at another booth.');return response(200,{recorded:true,hash});}
  let purchase;try{purchase=verifiedPurchase(await chain('/transactions/'+hash+'?withOperations=true'),hash,address);}catch(e){fail(422,e.message);}
  const [b]=await db(path+'&select=cleared_at&limit=1');if(!b)fail(404,'Booth unavailable.');
  let herotag=null;try{const a=await chain('/accounts/'+address);if(typeof a.username==='string'&&a.username.length<=100)herotag=a.username||null;}catch{/* ERD works without a herotag. */}
  await db('market_support_receipts?on_conflict=tx_hash','POST',{tx_hash:hash,scope,booth_id:booth,wallet_address:address,herotag,public_name:body.visible,...purchase},{Prefer:'resolution=ignore-duplicates,return=minimal'});
  const [saved]=await db('market_support_receipts?tx_hash=eq.'+hash+'&select=scope,booth_id&limit=1');
  if(saved?.scope!==scope||saved?.booth_id!==booth)fail(409,'This purchase is already recorded at another booth.');
  return response(200,{recorded:true,hash});
 }
 const auth=await adminSession(event);
 if(route==='edit'){const title=typeof body.title==='string'?body.title.trim():'',description=typeof body.description==='string'?body.description.trim():'';if(!title||title.length>100||description.length>1500)fail(400,'Use a title up to 100 characters and text up to 1500.');await db(path,'PATCH',{title,description,updated_at:now()});}
 if(route==='clear'){if(body.confirm!==true)fail(400,'Confirm clearing this board.');await db(path,'PATCH',{cleared_at:now(),updated_at:now()});}
 if(route==='photo'){const image=imageInput(body),image_path=scope+'/'+booth+'/'+randomUUID()+'.'+image.extension;await request('/storage/v1/object/market-support-images/'+image_path,'POST',image.bytes,{'Content-Type':image.type});await db(path,'PATCH',{image_path,updated_at:now()});}
 await db('market_support_actions','POST',{scope,booth_id:booth,actor_wallet:auth.admin.wallet_address,action:route==='photo'?'image':route});
 return response(200,{saved:true});
}catch(e){return response(e.status||503,{error:e.status?e.message:'Support room is temporarily unavailable. Please try again.'});}}
