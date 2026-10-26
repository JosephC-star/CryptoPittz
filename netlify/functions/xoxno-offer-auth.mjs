const collections=['PITTZ-1a4c2d','PITTZVICE-c3ec94'];
export async function handler(event){
 const reply=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)});
 if(event.httpMethod!=='POST')return reply(405,{error:'POST only.'});
 try{
  if((event.body||'').length>20000)return reply(400,{error:'Request too large.'});const b=JSON.parse(event.body||'{}');let path,body,auth;
  if(b.action==='token'){if(typeof b.origin!=='string'||!/^https:\/\/[^/]+$/.test(b.origin))return reply(400,{error:'Invalid origin.'});path='/user/native-token?'+new URLSearchParams({originalUrl:b.origin});}
  else if(b.action==='login'){if(typeof b.loginToken!=='string'||b.loginToken.length>12000)return reply(400,{error:'Invalid login.'});path='/user/login';body={loginToken:b.loginToken,service:'xoxno'};}
  else if(b.action==='sign'){if(!collections.includes(b.collection)||!Number.isSafeInteger(b.offerId)||b.offerId<=0||!new RegExp('^'+b.collection+'-[a-f0-9]{1,16}$').test(b.identifier||''))return reply(400,{error:'Invalid offer or Pittz.'});auth=event.headers?.authorization||event.headers?.Authorization;if(!/^Bearer [A-Za-z0-9._-]+$/.test(auth||''))return reply(401,{error:'Authorize XOXNO first.'});path='/collection/'+b.collection+'/sign-offer';body={offerId:b.offerId,identifier:[b.identifier]};}
  else return reply(400,{error:'Invalid action.'});
  const r=await fetch('https://api.xoxno.com'+path,{method:body?'POST':'GET',headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{}),...(auth?{Authorization:auth}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
  if(!r.ok)return reply(r.status===401||r.status===403?r.status:502,{error:b.action==='sign'?'XOXNO could not authorize this Pittz for this offer. Reauthorize or choose another Pittz.':'XOXNO authorization is unavailable. Try again.'});
  const raw=await r.text();let data;try{data=JSON.parse(raw);}catch{data=raw;}
  if(b.action==='token')return reply(200,{token:data});
  if(b.action==='login')return reply(200,{access_token:data.access_token});
  return reply(200,{data:data.data,signature:data.signature});
 }catch{return reply(502,{error:'XOXNO request could not complete. Try again.'});}
}
