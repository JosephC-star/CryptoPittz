-- Run after the initial market and admin schemas. No existing access is changed.
begin;
create table if not exists public.market_alert_contacts (
 shop_id uuid primary key references public.market_shops(id) on delete cascade,
 owner_wallet text not null,
 email text, verified_at timestamptz, enabled boolean not null default false,
 pending_email text, pending_hash text, pending_expires_at timestamptz,
 attempts integer not null default 0, last_requested_at timestamptz,
 request_day date, day_requests integer not null default 0
);
create table if not exists public.market_alert_jobs (
 id uuid primary key default gen_random_uuid(),
 inquiry_id uuid not null unique references public.market_inquiries(id) on delete cascade,
 shop_id uuid not null references public.market_shops(id) on delete cascade,
 owner_wallet text not null, recipient text not null,
 created_at timestamptz not null default now(),
 state text not null default 'pending' check(state in ('pending','processing','sent','failed','cancelled')),
 attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
 lease uuid, lease_until timestamptz, provider_id text
);
create or replace function public.market_queue_alert() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.market_alert_jobs(inquiry_id,shop_id,owner_wallet,recipient)
 select new.id,c.shop_id,c.owner_wallet,c.email from public.market_alert_contacts c
 join public.market_shops s on s.id=c.shop_id and s.owner_wallet=c.owner_wallet
 where c.shop_id=new.shop_id and c.enabled and c.verified_at is not null and not s.moderation_suspended;
 return new;
end $$;
drop trigger if exists market_inquiry_alert on public.market_inquiries;
create trigger market_inquiry_alert after insert on public.market_inquiries for each row execute function public.market_queue_alert();

create or replace function public.market_start_alert_verification(shop_key uuid, wallet_key text, email_value text, code_hash text)
returns boolean language plpgsql security definer set search_path='' as $$
declare c public.market_alert_contacts;
begin
 if not exists(select 1 from public.market_shops where id=shop_key and owner_wallet=wallet_key and not moderation_suspended) then return false; end if;
 insert into public.market_alert_contacts(shop_id,owner_wallet) values(shop_key,wallet_key) on conflict do nothing;
 select * into c from public.market_alert_contacts where shop_id=shop_key for update;
 if c.owner_wallet<>wallet_key then
  update public.market_alert_contacts set owner_wallet=wallet_key,email=null,verified_at=null,enabled=false,last_requested_at=null,day_requests=0 where shop_id=shop_key;
  c.last_requested_at:=null;c.day_requests:=0;
 end if;
 if c.last_requested_at>now()-interval '1 minute' or (c.request_day=current_date and c.day_requests>=5) then return false; end if;
 if email_value is null or code_hash is null or email_value !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$' or length(email_value)>320 or code_hash !~ '^[a-f0-9]{64}$' then return false; end if;
 update public.market_alert_contacts set pending_email=email_value,pending_hash=code_hash,pending_expires_at=now()+interval '15 minutes',attempts=0,last_requested_at=now(),request_day=current_date,day_requests=case when c.request_day=current_date then c.day_requests+1 else 1 end where shop_id=shop_key;
 return true;
end $$;
create or replace function public.market_verify_alert_email(shop_key uuid,wallet_key text,code_hash text)
returns boolean language plpgsql security definer set search_path='' as $$
declare c public.market_alert_contacts;
begin
 if code_hash is null or code_hash !~ '^[a-f0-9]{64}$' then return false; end if;
 select * into c from public.market_alert_contacts where shop_id=shop_key and owner_wallet=wallet_key for update;
 if not found or c.pending_expires_at<=now() or c.attempts>=5 or c.pending_hash is null then return false; end if;
 if not exists(select 1 from public.market_shops where id=shop_key and owner_wallet=wallet_key and not moderation_suspended) then return false; end if;
 update public.market_alert_contacts set attempts=attempts+1 where shop_id=shop_key;
 if c.pending_hash<>code_hash then return false; end if;
 update public.market_alert_contacts set email=c.pending_email,verified_at=now(),enabled=true,pending_email=null,pending_hash=null,pending_expires_at=null where shop_id=shop_key;
 return true;
end $$;
create or replace function public.market_claim_alerts() returns setof public.market_alert_jobs
language plpgsql security definer set search_path='' as $$
begin
 update public.market_alert_jobs set state='failed' where state in ('pending','processing') and created_at<now()-interval '20 hours';
 return query with candidates as (
  select id from public.market_alert_jobs where created_at>now()-interval '20 hours' and attempts<8
  and ((state='pending' and next_attempt_at<=now()) or (state='processing' and lease_until<now()))
  order by created_at limit 3 for update skip locked
 ) update public.market_alert_jobs j set state='processing',lease=gen_random_uuid(),lease_until=now()+interval '5 minutes',attempts=j.attempts+1 from candidates c where j.id=c.id returning j.*;
end $$;

create table if not exists public.market_rental_challenges (
 id uuid primary key default gen_random_uuid(), wallet_address text not null,
 origin text not null, nonce_hash text not null unique, expires_at timestamptz not null,
 used_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.market_rental_sessions (
 id uuid primary key default gen_random_uuid(), wallet_address text not null,
 origin text not null, token_hash text not null unique,expires_at timestamptz not null,revoked_at timestamptz
);
create table if not exists public.market_rental_intents (
 id uuid primary key, wallet_address text not null, origin text not null,
 months integer not null check(months in (1,6,12)), tier text not null check(tier in ('standard','meta','diamond','waived')),
 amount_atomic numeric(30,0) not null check(amount_atomic>=0),expected_nonce bigint not null check(expected_nonce>=0),
 policy_version text not null,key_identifier text,
 use_standard_rate boolean not null default false,
 shop_name text not null check(length(shop_name) between 1 and 120),
 created_at timestamptz not null default now(), expires_at timestamptz not null,
 state text not null default 'review' check(state in ('review','submitted','activated','cancelled','expired')),
 tx_hash text unique check(tx_hash ~ '^[a-f0-9]{64}$'),
 shop_id uuid references public.market_shops(id),activated_at timestamptz
);
create unique index if not exists market_one_open_rental on public.market_rental_intents(wallet_address) where state in ('review','submitted');
alter table public.market_rental_intents add column if not exists use_standard_rate boolean not null default false;

create or replace function public.market_create_rental(review_data jsonb) returns public.market_rental_intents
language plpgsql security definer set search_path='' as $$
declare r public.market_rental_intents;
begin
 perform pg_advisory_xact_lock(hashtextextended(review_data->>'wallet_address',0));
 update public.market_rental_intents set state='expired' where wallet_address=review_data->>'wallet_address' and state='review' and expires_at<=now();
 select * into r from public.market_rental_intents where wallet_address=review_data->>'wallet_address' and state in ('review','submitted');
 if found then return r; end if;
 insert into public.market_rental_intents(id,wallet_address,origin,months,tier,amount_atomic,expected_nonce,policy_version,key_identifier,use_standard_rate,shop_name,expires_at)
 values((review_data->>'id')::uuid,review_data->>'wallet_address',review_data->>'origin',(review_data->>'months')::integer,review_data->>'tier',(review_data->>'amount_atomic')::numeric,(review_data->>'expected_nonce')::bigint,review_data->>'policy_version',review_data->>'key_identifier',coalesce((review_data->>'use_standard_rate')::boolean,false),review_data->>'shop_name',(review_data->>'expires_at')::timestamptz) returning * into r;
 return r;
end $$;

create or replace function public.market_activate_rental(intent_key uuid,wallet_key text,receipt_hash text)
returns public.market_shops language plpgsql security definer set search_path='' as $$
declare r public.market_rental_intents;s public.market_shops;base_at timestamptz;next_booth integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(wallet_key,0));
 select * into r from public.market_rental_intents where id=intent_key and wallet_address=wallet_key for update;
 if not found then raise exception 'Rental review not found'; end if;
 if r.state='activated' then select * into s from public.market_shops where id=r.shop_id;return s;end if;
 if r.amount_atomic>0 then
  if r.state<>'submitted' or r.tx_hash is distinct from receipt_hash then raise exception 'Receipt not reserved'; end if;
 else
  if r.state<>'review' or r.expires_at<=now() or receipt_hash is not null then raise exception 'No-charge review expired'; end if;
 end if;
 select * into s from public.market_shops where owner_wallet=wallet_key for update;
 if found and (s.moderation_suspended or s.access_status='suspended') then raise exception 'Store suspended'; end if;
 if s.id is null then
  perform pg_advisory_xact_lock(8817042);
  select coalesce(max(booth_number),0)+1 into next_booth from public.market_shops;
  insert into public.market_shops(booth_number,owner_wallet,name) values(next_booth,wallet_key,r.shop_name) returning * into s;
 end if;
 base_at:=greatest(now(),coalesce(s.rental_expires_at,now()));
 -- Calendar months, month-end clamping and extension from an existing paid expiry, all in UTC.
 if s.access_status<>'test' then
  update public.market_shops set access_status='active',rental_expires_at=((base_at at time zone 'UTC')+make_interval(months=>r.months)) at time zone 'UTC' where id=s.id returning * into s;
 end if;
 update public.market_rental_intents set state='activated',shop_id=s.id,activated_at=now() where id=r.id;
 return s;
end $$;

do $$ declare table_name text;begin
 foreach table_name in array array['market_alert_contacts','market_alert_jobs','market_rental_challenges','market_rental_sessions','market_rental_intents'] loop
 execute format('alter table public.%I enable row level security',table_name);
 execute format('revoke all on public.%I from public,anon,authenticated',table_name);
 execute format('grant select,insert,update,delete on public.%I to service_role',table_name);
 end loop;
end $$;
revoke all on function public.market_queue_alert(),public.market_claim_alerts(),public.market_start_alert_verification(uuid,text,text,text),public.market_verify_alert_email(uuid,text,text),public.market_create_rental(jsonb),public.market_activate_rental(uuid,text,text) from public,anon,authenticated;
grant execute on function public.market_claim_alerts(),public.market_start_alert_verification(uuid,text,text,text),public.market_verify_alert_email(uuid,text,text),public.market_create_rental(jsonb),public.market_activate_rental(uuid,text,text) to service_role;
commit;
select to_regclass('public.market_alert_jobs') is not null as alerts_ready,to_regclass('public.market_rental_intents') is not null as rentals_ready;
