export async function handler(event) {
  const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
  const reply=(statusCode,body)=>({statusCode,headers,body:JSON.stringify(body)});
  if(event.httpMethod!=='GET') return reply(405,{error:'GET only.'});
  const {input,amount}=event.queryStringParameters||{};
  if(!['EGLD','BONEZ'].includes(input)||!/^\d{1,40}$/.test(amount||'')||BigInt(amount)<=0n) return reply(400,{error:'Invalid swap request.'});
  const params=new URLSearchParams({token_in:input==='EGLD'?'WEGLD-bd4d79':'BONEZ-ff9a73',token_out:input==='EGLD'?'BONEZ-ff9a73':'WEGLD-bd4d79',amount_in:amount,with_dyn_routing:'false',max_hops:'3'});
  try {
    const r=await fetch('https://agg-api.jexchange.io/evaluate?'+params,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(22000)});
    if(!r.ok) throw Error('UPSTREAM_HTTP_'+r.status);
    const data=await r.json();
    if(!data.static) return reply(422,{error:'No available route for this amount.'});
    return reply(200,{quote:data.static});
  }catch(error){return reply(502,{error:'JEX quotes are temporarily unavailable. Please try again.',reason:error.name==='TimeoutError'?'UPSTREAM_TIMEOUT':error.message});}
}
