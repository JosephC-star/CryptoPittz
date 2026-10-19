import {db} from './market-api.mjs';
import {mailReady,sendMarketMail} from '../../server/market-email.mjs';
import {reminderStage,reminderMail} from '../../shared/rental-lifecycle.mjs';
export const config={schedule:'*/15 * * * *'};
export async function dispatchReminders(context){
 if(context?.deploy?.context!=='production'||context.deploy.published===false||process.env.MARKET_RENTAL_REMINDERS_ENABLED!=='true'||!mailReady())return {statusCode:204};
 let jobs;try{jobs=await db('rpc/market_claim_rental_reminders','POST',{});}catch{console.error('market-rental-reminders: queue unavailable; check reminder database setup');return {statusCode:503};}
 console.info('market-rental-reminders: claimed '+jobs.length+' jobs');
 for(const job of jobs){const query='market_rental_reminder_jobs?id=eq.'+job.id+'&lease=eq.'+job.lease;
  try{
   const [contacts,shops]=await Promise.all([
    db('market_alert_contacts?shop_id=eq.'+job.shop_id+'&owner_wallet=eq.'+job.owner_wallet+'&email=eq.'+encodeURIComponent(job.recipient)+'&enabled=eq.true&rental_reminders=eq.true&verified_at=not.is.null&select=shop_id&limit=1'),
    db('market_shops?id=eq.'+job.shop_id+'&owner_wallet=eq.'+job.owner_wallet+'&access_status=eq.active&moderation_suspended=eq.false&select=rental_expires_at&limit=1')]);
   const shop=shops[0];
   if(!contacts.length||!shop||Date.parse(shop.rental_expires_at)!==Date.parse(job.rental_expires_at)||reminderStage(shop.rental_expires_at)!==job.kind){await db(query,'PATCH',{state:'cancelled',lease_until:null});continue;}
   const mail=reminderMail(job),id=await sendMarketMail(job.recipient,mail.subject,mail.text,'market-rental-reminder/'+job.id);
   await db(query,'PATCH',{state:'sent',provider_id:id,lease_until:null});
  }catch{console.error('market-rental-reminders: delivery failed; recording retry');try{await db(query,'PATCH',{state:job.attempts>=8?'failed':'pending',next_attempt_at:new Date(Date.now()+Math.min(60,2**job.attempts)*60000).toISOString(),lease_until:null});}catch{}}
 }
 return {statusCode:204};
}
export default async function(_request,context){const result=await dispatchReminders(context);return new Response(null,{status:result.statusCode});}
