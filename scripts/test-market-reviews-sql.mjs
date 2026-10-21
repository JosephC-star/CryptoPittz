const {PGlite}=await import(process.env.PITTZ_PGLITE_MODULE||'@electric-sql/pglite');
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role;
create table market_shops(id uuid primary key,access_status text,rental_expires_at timestamptz,moderation_suspended boolean default false);
create table market_admins(wallet_address text primary key,active boolean);
insert into market_shops values('11111111-1111-4111-8111-111111111111','test',null,false),('22222222-2222-4222-8222-222222222222','test',null,false);
insert into market_admins values('admin',true);`);
const sql=readFileSync(new URL('../supabase/setup/market-reviews.sql',import.meta.url),'utf8');await db.exec(sql);await db.exec(sql);
const shop='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const ids=['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','cccccccc-cccc-4ccc-8ccc-cccccccccccc'];
async function submit(id,shop,hash='a'.repeat(64),score=5){return (await db.query('select market_submit_review($1,$2,$3,$4,$5,$6) as ok',[id,shop,'Pack friend','A helpful shop experience.',score,hash])).rows[0].ok;}
assert.equal(await submit(ids[0],shop),true);
assert.equal(await submit(ids[0],shop),true); // repeat request adds nothing
assert.equal(await submit(ids[1],shop),false); // same shop / client / day
assert.equal(await submit(ids[1],other),true);
assert.equal(await submit(ids[2],shop,'b'.repeat(64),1),true);
let summary=(await db.query('select market_review_summary($1) as s',[shop])).rows[0].s;
assert.equal(summary.count,0); // pending excluded
await db.query('select market_moderate_review($1,$2,$3,$4)',['admin',ids[0],'published','Genuine community feedback']);
await db.query('select market_moderate_review($1,$2,$3,$4)',['admin',ids[2],'published','Genuine critical feedback']);
summary=(await db.query('select market_review_summary($1) as s',[shop])).rows[0].s;assert.equal(summary.count,2);assert.equal(summary.average,3);
await db.query('select market_moderate_review($1,$2,$3,$4)',['admin',ids[0],'hidden','Contains private information']);
summary=(await db.query('select market_review_summary($1) as s',[shop])).rows[0].s;assert.equal(summary.count,1);assert.equal(summary.average,1);
assert.equal((await db.query('select count(*)::int as n from market_review_actions')).rows[0].n,3);
await assert.rejects(db.query('select market_moderate_review($1,$2,$3,$4)',['stranger',ids[2],'hidden','I dislike criticism']));
await db.exec('set role anon');await assert.rejects(db.query('select * from market_reviews'));await assert.rejects(db.query('select market_review_summary($1)',[shop]));await db.exec('reset role');
await db.close();console.log('Review SQL passed: rerun, idempotency, daily limit, pending exclusion, mixed-rating average, hiding, audit and anonymous-access denial.');
