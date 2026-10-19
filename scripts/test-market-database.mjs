// Optional local SQL integration check: install @electric-sql/pglite outside the production app.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.MARKET_PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite();let checks=0;
try{
 await db.exec('create role anon;create role authenticated;create role service_role;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);');
 for(const path of ['supabase/migrations/20261015_market_initial.sql','supabase/setup/market-admin-moderation.sql','supabase/setup/market-rentals-and-alerts.sql'])await db.exec(fs.readFileSync(path,'utf8'));
 const q=async(sql,params=[])=> (await db.query(sql,params)).rows;
 const wallet='erd1'+'a'.repeat(58),other='erd1'+'b'.repeat(58),third='erd1'+'c'.repeat(58);
 const [shop]=await q("update market_shops set owner_wallet=$1,access_status='test' where booth_number=1 returning *",[wallet]);
 const start=async(code='a'.repeat(64))=>(await q('select market_start_alert_verification($1,$2,$3,$4) as ok',[shop.id,wallet,'merchant@example.test',code]))[0].ok;
 const verify=async(code)=>(await q('select market_verify_alert_email($1,$2,$3) as ok',[shop.id,wallet,code]))[0].ok;
 assert(await start());assert(!await start());checks++;
 for(let i=0;i<5;i++)assert(!await verify('b'.repeat(64)));assert(!await verify('a'.repeat(64)));checks++;
 await q("update market_alert_contacts set last_requested_at=now()-interval '2 minutes' where shop_id=$1",[shop.id]);assert(await start());assert(await verify('a'.repeat(64)));assert(!await verify('a'.repeat(64)));checks++;
 await q("insert into market_inquiries(shop_id,customer_name,customer_email,message) values($1,'Customer','customer@example.test','Hello')",[shop.id]);assert.equal((await q('select * from market_alert_jobs')).length,1);checks++;
 const jobs=await q('select * from market_claim_alerts()');assert.equal(jobs.length,1);assert.equal((await q('select * from market_claim_alerts()')).length,0);checks++;
 await q("update market_alert_jobs set lease_until=now()-interval '1 minute'");assert.equal((await q('select * from market_claim_alerts()')).length,1);checks++;
 await q("update market_alert_jobs set created_at=now()-interval '21 hours',lease_until=now()-interval '1 minute'");assert.equal((await q('select * from market_claim_alerts()')).length,0);assert.equal((await q('select state from market_alert_jobs'))[0].state,'failed');checks++;
 const create=async(address,id=crypto.randomUUID(),months=1)=>{const data={id,wallet_address:address,origin:'https://thepittzstop.com',months,tier:'standard',amount_atomic:months===6?'330000000000':'60000000000',expected_nonce:'0',policy_version:'2026-10-15-v1',terms_version:'2026-10-16-v1',shop_name:'New merchant',expires_at:new Date(Date.now()+600000).toISOString()};return (await q('select * from market_create_rental($1::jsonb)',[JSON.stringify(data)]))[0];};
 const r=await create(other);assert.equal((await create(other)).id,r.id);checks++;
 await assert.rejects(q('select * from market_activate_rental($1,$2,$3)',[r.id,other,'a'.repeat(64)]),/Receipt not reserved/);checks++;
 await q("update market_rental_intents set state='submitted',tx_hash=$2 where id=$1",[r.id,'a'.repeat(64)]);
 const activate=async(r,address,hash)=>(await q('select * from market_activate_rental($1,$2,$3)',[r.id,address,hash]))[0];
 const store=await activate(r,other,'a'.repeat(64));assert.equal(store.booth_number,2);assert.equal(store.access_status,'active');assert.equal(r.terms_version,'2026-10-16-v1');assert(r.terms_accepted_at);checks++;
 const repeat=await activate(r,other,'a'.repeat(64));assert.equal(+repeat.rental_expires_at,+store.rental_expires_at);assert.equal((await q('select * from market_shops')).length,2);checks++;
 const renewal=await create(other,crypto.randomUUID(),6);await q("update market_rental_intents set state='submitted',tx_hash=$2 where id=$1",[renewal.id,'b'.repeat(64)]);
 const renewed=await activate(renewal,other,'b'.repeat(64));assert.equal(renewed.booth_number,2);assert(+renewed.rental_expires_at>+store.rental_expires_at);checks++;
 const next=await create(third);await assert.rejects(q("update market_rental_intents set tx_hash=$2 where id=$1",[next.id,'a'.repeat(64)]),/unique/);checks++;
 await q("update market_rental_intents set state='submitted',tx_hash=$2 where id=$1",[next.id,'c'.repeat(64)]);assert.equal((await activate(next,third,'c'.repeat(64))).booth_number,3);checks++;
 const suspended=await create(other);await q("update market_shops set moderation_suspended=true where owner_wallet=$1",[other]);await q("update market_rental_intents set state='submitted',tx_hash=$2 where id=$1",[suspended.id,'d'.repeat(64)]);await assert.rejects(activate(suspended,other,'d'.repeat(64)),/Store suspended/);checks++;
 // A lapsed shop renews from now, reuses its booth, and keeps its inventory.
 await q("update market_shops set moderation_suspended=false,rental_expires_at=now()-interval '30 days' where owner_wallet=$1",[other]);
 await q("insert into market_products(shop_id,name,status) values($1,'Retained item','published')",[store.id]);
 const reopenedReview=await create(other);await q("update market_rental_intents set state='submitted',tx_hash=$2 where id=$1",[reopenedReview.id,'e'.repeat(64)]);
 const reopened=await activate(reopenedReview,other,'e'.repeat(64));assert.equal(reopened.id,store.id);assert.equal(reopened.booth_number,2);assert(+reopened.rental_expires_at>Date.now()+27*86400000);assert.equal((await q('select * from market_products where shop_id=$1',[store.id])).length,1);checks++;
 assert.equal((await q("select ('2027-01-31T12:00:00Z'::timestamptz at time zone 'UTC'+make_interval(months=>1))::text as clamped"))[0].clamped,'2027-02-28 12:00:00');checks++;
 await db.exec('set role anon');await assert.rejects(q('select * from market_rental_intents'),/permission denied/);await assert.rejects(q('select * from market_claim_alerts()'),/permission denied/);await db.exec('reset role');checks++;
 await db.exec(fs.readFileSync('supabase/setup/market-rentals-and-alerts.sql','utf8'));assert.equal((await q('select * from market_shops')).length,3);checks++;
 console.log(checks+' database integration checks passed: email verification and retries, job leases, atomic booth allocation, duplicate receipts, renewal extension, suspension, UTC month-end clamping, private permissions and safe schema reruns.');
}finally{await db.close();}
