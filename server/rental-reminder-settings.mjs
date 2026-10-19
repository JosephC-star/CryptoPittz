import {db,fail} from '../netlify/functions/market-api.mjs';
import {mailReady} from './market-email.mjs';
export const remindersConfigured=()=>process.env.MARKET_RENTAL_REMINDERS_ENABLED==='true'&&mailReady();
export async function setRentalReminders(shop,enabled){
 if(typeof enabled!=='boolean')fail(400,'Choose whether rental reminders are enabled.');
 if(!shop)fail(404,'No assigned shop was found.');
 if(!remindersConfigured())fail(503,'Rental reminders are awaiting setup.');
 const rows=await db('market_alert_contacts?shop_id=eq.'+shop.id+'&owner_wallet=eq.'+shop.owner_wallet+(enabled?'&enabled=eq.true&verified_at=not.is.null':'') ,'PATCH',{rental_reminders:enabled},{Prefer:'return=representation'});
 if(!rows.length)fail(409,'Verify and enable your shop alert email before turning on rental reminders.');
 return {rentalReminders:rows[0].rental_reminders===true};
}
