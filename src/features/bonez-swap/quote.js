import { BONEZ, WEGLD } from './validation.js';
export async function fetchSwapQuote(input,amount,request=fetch) {
  const params=new URLSearchParams({input,amount});
  try {
    const r=await request('/.netlify/functions/bonez-quote?'+params,{cache:'no-store',signal:AbortSignal.timeout(30000)});
    const data=await r.json();
    if(r.ok&&data.quote)return data.quote;
  }catch{/* Read-only fallback to the same JEX quote API used by its own app. */}
  const query=new URLSearchParams({token_in:input==='EGLD'?WEGLD:BONEZ,token_out:input==='EGLD'?BONEZ:WEGLD,amount_in:amount,with_dyn_routing:'false',max_hops:'3'});
  const r=await request('https://agg-api.jexchange.io/evaluate?'+query,{cache:'no-store',signal:AbortSignal.timeout(20000)});
  const data=await r.json();
  if(!r.ok||!data.static)throw Error('A live quote is unavailable right now. Please try again.');
  return data.static;
}
