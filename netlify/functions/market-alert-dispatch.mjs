import {db} from './market-api.mjs';
import {mailReady,sendMarketMail} from '../../server/market-email.mjs';
export const config={schedule:'* * * * *'};
export async function dispatchAlerts(){
 if(process.env.CONTEXT!=='production'||!mailReady())return {statusCode:204};
 let jobs;try{jobs=await db('rpc/market_claim_alerts','POST',{});}catch{return {statusCode:503};}
 for(const job of jobs){
  const query='market_alert_jobs?id=eq.'+job.id+'&lease=eq.'+job.lease;
  try{
   const contacts=await db('market_alert_contacts?shop_id=eq.'+job.shop_id+'&owner_wallet=eq.'+job.owner_wallet+'&email=eq.'+encodeURIComponent(job.recipient)+'&enabled=eq.true&verified_at=not.is.null&select=shop_id&limit=1');
   const shops=await db('market_shops?id=eq.'+job.shop_id+'&owner_wallet=eq.'+job.owner_wallet+'&moderation_suspended=eq.false&select=id&limit=1');
   if(!contacts.length||!shops.length){await db(query,'PATCH',{state:'cancelled',lease_until:null});continue;}
   // Keep customer identity, message text and private pictures in the authenticated inbox.
   const providerId=await sendMarketMail(job.recipient,'New inquiry for your PittzStop shop','A customer has sent a new inquiry to your shop.\n\nOpen your private inbox: https://thepittzstop.com/merchant-access\nReference: '+job.inquiry_id+'\n\nYou can turn off alerts in Shop details.','market-inquiry/'+job.id);
   await db(query,'PATCH',{state:'sent',provider_id:providerId,lease_until:null});
  }catch{
   try{await db(query,'PATCH',{state:job.attempts>=8?'failed':'pending',next_attempt_at:new Date(Date.now()+Math.min(60,2**job.attempts)*60000).toISOString(),lease_until:null});}catch{}
  }
 }
 return {statusCode:204};
}
export default async function(){const result=await dispatchAlerts();return new Response(null,{status:result.statusCode});}
