import { quoteParams } from '../../src/features/bonez-swap/tokens.js';
export async function handler(event) {
  const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
  const reply=(statusCode,body)=>({statusCode,headers,body:JSON.stringify(body)});
  if(event.httpMethod!=='GET') return reply(405,{error:'GET only.'});
  const {input,output,amount}=event.queryStringParameters||{};
  let params;
  try{params=quoteParams(input==='BONEZ'?'BONEZ-ff9a73':input,output|| (input==='EGLD'?'BONEZ-ff9a73':'EGLD'),amount);}catch(error){return reply(400,{error:error.message});}
  try {
    const r=await fetch('https://agg-api.jexchange.io/evaluate?'+params,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(22000)});
    if(!r.ok) throw Error('UPSTREAM_HTTP_'+r.status);
    const data=await r.json();
    if(!data.static) return reply(422,{error:'No route available for this pair and amount. Try another token or amount.'});
    return reply(200,{quote:data.static});
  }catch(error){return reply(502,{error:'JEX quotes are temporarily unavailable. Please try again.',reason:error.name==='TimeoutError'?'UPSTREAM_TIMEOUT':error.message});}
}
