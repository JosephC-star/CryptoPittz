begin;
alter table public.market_inquiries add column if not exists message_kind text not null default 'customer' check(message_kind in ('customer','welcome'));
alter table public.market_alert_jobs add column if not exists kind text not null default 'inquiry' check(kind in ('inquiry','merchant-signup'));
create table if not exists public.market_merchant_onboarding (
 shop_id uuid primary key references public.market_shops(id),
 owner_wallet text not null,
 created_at timestamptz not null default now()
);
alter table public.market_merchant_onboarding enable row level security;
revoke all on public.market_merchant_onboarding from public,anon,authenticated;
grant select,insert,update,delete on public.market_merchant_onboarding to service_role;
-- Existing merchants are not new signups; never notify again on renewal.
insert into public.market_merchant_onboarding(shop_id,owner_wallet)
select id,owner_wallet from public.market_shops where owner_wallet is not null
on conflict(shop_id) do nothing;

drop trigger if exists market_inquiry_alert on public.market_inquiries;
create trigger market_inquiry_alert after insert on public.market_inquiries for each row when(new.message_kind='customer') execute function public.market_queue_alert();

create or replace function public.market_welcome_merchant() returns trigger language plpgsql set search_path='' as $$
declare added uuid; welcome_id uuid;
begin
 insert into public.market_merchant_onboarding(shop_id,owner_wallet) values(new.id,new.owner_wallet)
 on conflict(shop_id) do nothing returning shop_id into added;
 if added is null then return new; end if;
 insert into public.market_inquiries(shop_id,customer_name,customer_email,message,message_kind)
 values(new.id,'The PittzStop Team','Cryptopittz69@gmail.com',
 E'Welcome to the PittzStop Flea Market! 🐾\n\nYour corner of the pack is ready. Start by adding your shop picture and a little about what you make, then add your first products or portfolio photos.\n\nCustomer messages will arrive right here in your private inbox. You can turn on email alerts in Shop details so you know when someone reaches out.\n\nQuestions or need a hand? Reply to the PittzStop team at Cryptopittz69@gmail.com. We are glad you are here!\n\nBig talent. Small booths. One pack.', 'welcome') returning id into welcome_id;
 insert into public.market_alert_jobs(inquiry_id,shop_id,owner_wallet,recipient,kind)
 values(welcome_id,new.id,new.owner_wallet,'cryptopittz69@gmail.com','merchant-signup');
 return new;
end $$;
revoke all on function public.market_welcome_merchant() from public,anon,authenticated;
grant execute on function public.market_welcome_merchant() to service_role;
drop trigger if exists market_new_merchant_welcome on public.market_shops;
create trigger market_new_merchant_welcome after insert or update of access_status,owner_wallet on public.market_shops
for each row when(new.owner_wallet is not null and new.access_status in ('active','test')) execute function public.market_welcome_merchant();

-- Keep the existing dispatcher from consuming new signup jobs before deployment.
create or replace function public.market_claim_alerts() returns setof public.market_alert_jobs language plpgsql security invoker set search_path='' as $$
begin
 update public.market_alert_jobs set state='failed' where kind='inquiry' and state in ('pending','processing') and created_at<now()-interval '20 hours';
 return query with candidates as (
  select id from public.market_alert_jobs where kind='inquiry' and created_at>now()-interval '20 hours' and attempts<8
  and ((state='pending' and next_attempt_at<=now()) or (state='processing' and lease_until<now()))
  order by created_at limit 3 for update skip locked
 ) update public.market_alert_jobs j set state='processing',lease=gen_random_uuid(),lease_until=now()+interval '5 minutes',attempts=j.attempts+1 from candidates c where j.id=c.id returning j.*;
end $$;
create or replace function public.market_claim_signup_alerts() returns setof public.market_alert_jobs language plpgsql security invoker set search_path='' as $$
begin
 update public.market_alert_jobs set state='failed' where kind='merchant-signup' and state in ('pending','processing') and created_at<now()-interval '20 hours';
 return query with candidates as (
  select id from public.market_alert_jobs where kind='merchant-signup' and created_at>now()-interval '20 hours' and attempts<8
  and ((state='pending' and next_attempt_at<=now()) or (state='processing' and lease_until<now()))
  order by created_at limit 3 for update skip locked
 ) update public.market_alert_jobs j set state='processing',lease=gen_random_uuid(),lease_until=now()+interval '5 minutes',attempts=j.attempts+1 from candidates c where j.id=c.id returning j.*;
end $$;
revoke all on function public.market_claim_alerts(),public.market_claim_signup_alerts() from public,anon,authenticated;
grant execute on function public.market_claim_alerts(),public.market_claim_signup_alerts() to service_role;
commit;
