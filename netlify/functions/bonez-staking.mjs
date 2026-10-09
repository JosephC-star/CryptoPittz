import {CONTRACT,TOKEN,POOL,validateStaking} from '../../src/features/bonez-staking/validation.js';
export async function handler(event){
 const reply=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)});
 if(event.httpMethod!=='GET')return reply(405,{error:'GET only.'});
 const user=event.queryStringParameters?.user;
 if(user&&!/^[a-f0-9]{64}$/.test(user))return reply(400,{error:'Invalid wallet public key.'});
 try{
  const q=async (funcName,args=['31'])=>{
   const r=await fetch('https://gateway.multiversx.com/vm-values/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scAddress:CONTRACT,funcName,args}),signal:AbortSignal.timeout(12000)});
   const j=await r.json(),d=j.data?.data;
   if(!r.ok||j.code!=='successful'||d?.returnCode!=='ok'||!Array.isArray(d.returnData)||d.returnData.length>1000)throw Error('Staking query failed.');return d.returnData;
  };
  const integer=v=>BigInt('0x'+(Buffer.from(v,'base64').toString('hex')||'00')).toString();
  const one=d=>{if(d.length!==1)throw Error('Invalid return data');return d[0];};
  const [token,state,paused,total,reserve,epochs,...position]=await Promise.all([
   q('getPoolStakeTokenId'),q('getPoolState'),q('getPaused',[]),q('getPoolTotalStakeAmount'),q('getPoolRewardDepositAmount'),q('getPoolUnbondEpochs'),
   ...(user?['getPoolUserStakeAmount','getPoolUserCurrentRewardAmount','getPoolUserUnbonds'].map(f=>q(f,['31',user])):[])
  ]);
  const pool={address:CONTRACT,poolId:POOL,token:Buffer.from(one(token),'base64').toString('utf8'),paused:integer(one(state))!=='0'||integer(one(paused))!=='0',totalStaked:integer(one(total)),rewardReserve:integer(one(reserve)),unbondEpochs:Number(integer(one(epochs))),updated:Date.now(),...(user?{user:{staked:integer(one(position[0])),rewards:integer(one(position[1])),pendingCount:position[2].length}}:{})};
  validateStaking(pool);return reply(200,{pool});
 }catch{return reply(502,{error:'The BONEZ staking pool could not be verified right now. Refresh to try again.'});}
}
