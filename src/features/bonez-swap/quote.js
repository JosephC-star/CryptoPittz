import { BONEZ } from './validation.js';
import { quoteParams } from './tokens.js';
export async function fetchSwapQuote(input,amount,request=fetch,output=input==='EGLD'?BONEZ:'EGLD') {
  const query=quoteParams(input,output,amount);
  const params=new URLSearchParams({input,output,amount});
  try {
    const r=await request('/.netlify/functions/bonez-quote?'+params,{cache:'no-store',signal:AbortSignal.timeout(30000)});
    const data=await r.json();
    if(r.ok&&data.quote)return data.quote;
    if(r.status===422||r.status===400)throw Object.assign(Error(data.error),{noRoute:true});
  }catch(error){if(error.noRoute)throw error;/* Read-only fallback to the same JEX quote API used by its own app. */}

  const r=await request('https://agg-api.jexchange.io/evaluate?'+query,{cache:'no-store',signal:AbortSignal.timeout(20000)});
  const data=await r.json();
  if(r.ok&&!data.static)throw Error('No route available for this pair and amount. Try another token or amount.');
  if(!r.ok)throw Error('A live quote is unavailable right now. Please try again.');
  return data.static;
}
