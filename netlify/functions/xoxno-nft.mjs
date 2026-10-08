const pattern=/^(PITTZ-1a4c2d|PITTZVICE-c3ec94)-[a-f0-9]{1,16}$/;
export async function handler(event){
 const reply=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)});
 if(event.httpMethod!=='GET')return reply(405,{error:'GET only.'});
 const identifier=event.queryStringParameters?.identifier;
 if(!pattern.test(identifier||''))return reply(400,{error:'Unsupported CryptoPittz NFT.'});
 try{
  const r=await fetch(`https://api.xoxno.com/nft/${identifier}`,{signal:AbortSignal.timeout(18000),headers:{Accept:'application/json'}});
  if(r.status===404)return reply(404,{error:'NFT not found on XOXNO.'});
  if(!r.ok)throw Error('XOXNO unavailable');const data=await r.json();
  if(data.identifier!==identifier)throw Error('NFT mismatch');
  return reply(200,{identifier:data.identifier,collection:data.collection,saleInfo:data.saleInfo||null});
 }catch{return reply(502,{error:'XOXNO listing lookup is temporarily unavailable. Please try again.'});}
}
