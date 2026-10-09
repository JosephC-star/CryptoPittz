import { PAIR,validatePool } from '../../src/features/bonez-liquidity/validation.js';
export async function handler(event){
 const reply=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)});
 if(event.httpMethod!=='GET')return reply(405,{error:'GET only.'});
 try{
  const query=async funcName=>{
   const r=await fetch('https://gateway.multiversx.com/vm-values/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scAddress:PAIR,funcName,args:[]}),signal:AbortSignal.timeout(12000)});
   const x=await r.json();if(!r.ok||x.code!=='successful'||x.data?.data?.returnCode!=='ok'||!Array.isArray(x.data.data.returnData))throw Error('Query failed');return x.data.data.returnData;
  };
  const [first,second,lp,reserves,state]=await Promise.all(['getFirstTokenId','getSecondTokenId','getLpTokenIdentifier','getReservesAndTotalSupply','getState'].map(query));
  if(first.length!==1||second.length!==1||lp.length!==1||reserves.length!==3||state.length!==1)throw Error('Invalid return data');
  const text=v=>Buffer.from(v,'base64').toString('utf8');
  const integer=v=>BigInt('0x'+(Buffer.from(v,'base64').toString('hex')||'00')).toString();
  const pool={address:PAIR,firstToken:text(first[0]),secondToken:text(second[0]),lpToken:text(lp[0]),firstReserve:integer(reserves[0]),secondReserve:integer(reserves[1]),totalSupply:integer(reserves[2]),state:Number(integer(state[0])),updated:Date.now()};
  validatePool(pool);return reply(200,{pool});
 }catch{return reply(502,{error:'The BONEZ pool could not be verified right now. Refresh to try again.'});}
}
