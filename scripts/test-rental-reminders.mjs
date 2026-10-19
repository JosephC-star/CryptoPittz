// Local database integration test. Uses a temporary PGlite installation, never production.
import fs from 'node:fs';import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.MARKET_PGLITE_MODULE||'@electric-sql/pglite'),db=new PGlite();
try{
 await db.exec('create role anon;create role authenticated;create role service_role;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);');
 for(const path of ['supabase/migrations/20261015_market_initial.sql','supabase/setup/market-admin-moderation.sql','supabase/setup/market-rentals-and-alerts.sql','supabase/setup/market-rental-reminders.sql'])await db.exec(fs.readFileSync(path,'utf8'));
 const q=async(sql,params=[])=> (await db.query(sql,params)).rows;
 const add=async(booth,days,status='active',enabled=true)=>{const [s]=await q("insert into market_shops(booth_number,owner_wallet,name,access_status,rental_expires_at) values($1,$2,'Merchant',$3,now()+$4*interval '1 day') returning *",[booth,'erd1'+String(booth).repeat(58),status,days]);await q("insert into market_alert_contacts(shop_id,owner_wallet,email,verified_at,enabled,rental_reminders) values($1,$2,'merchant@example.test',now(),$3,true)",[s.id,s.owner_wallet,enabled]);return s;};
 const early=await add(2,3),soon=await add(3,.5),expired=await add(4,-1);await add(5,3,'test');await add(6,3,'active',false);const suspended=await add(7,3);await q('update market_shops set moderation_suspended=true where id=$1',[suspended.id]);
 let jobs=await q('select * from market_claim_rental_reminders()');assert.equal(jobs.length,3);assert.deepEqual(jobs.map(j=>j.kind).sort(),['expired','one_day','seven_days']);assert.equal((await q('select * from market_claim_rental_reminders()')).length,0);
 await q("update market_shops set rental_expires_at=now()+interval '30 days' where id=$1",[early.id]);await q('update market_alert_contacts set rental_reminders=false where shop_id=$1',[soon.id]);await q('select * from market_claim_rental_reminders()');assert.equal((await q("select * from market_rental_reminder_jobs where state='cancelled'")).length,2);
 await q("update market_rental_reminder_jobs set lease_until=now()-interval '1 minute' where shop_id=$1",[expired.id]);jobs=await q('select * from market_claim_rental_reminders()');assert.equal(jobs.length,1);assert.equal(jobs[0].attempts,2);
 await q("update market_rental_reminder_jobs set created_at=now()-interval '21 hours',lease_until=now()-interval '1 minute' where shop_id=$1",[expired.id]);assert.equal((await q('select * from market_claim_rental_reminders()')).length,0);assert.equal((await q('select state from market_rental_reminder_jobs where shop_id=$1',[expired.id]))[0].state,'failed');
 // Advance an existing term into a new stage: exactly one new notice.
 await q("update market_shops set rental_expires_at=now()+interval '12 hours' where id=$1",[early.id]);jobs=await q('select * from market_claim_rental_reminders()');assert.equal(jobs.length,1);assert.equal(jobs[0].kind,'one_day');
 await db.exec('set role anon');await assert.rejects(q('select * from market_rental_reminder_jobs'),/permission denied/);await assert.rejects(q('select * from market_claim_rental_reminders()'),/permission denied/);await db.exec('reset role');
 await db.exec(fs.readFileSync('supabase/setup/market-rental-reminders.sql','utf8'));assert.equal((await q('select * from market_rental_reminder_jobs')).length,4);
 console.log('Rental reminder SQL checks passed: opt-in, stages, complimentary/suspended exclusion, deduplication, renew/disable cancellation, leased retries, retry age limit, permissions and safe reruns.');
}finally{await db.close();}
