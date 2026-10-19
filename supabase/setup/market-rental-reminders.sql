-- Run after market-rentals-and-alerts.sql. Safe to rerun; reminders default off.
begin;
alter table public.market_alert_contacts add column if not exists rental_reminders boolean not null default false;
create table if not exists public.market_rental_reminder_jobs (
 id uuid primary key default gen_random_uuid(),
 shop_id uuid not null references public.market_shops(id) on delete cascade,
 owner_wallet text not null, recipient text not null, rental_expires_at timestamptz not null,
 kind text not null check(kind in ('seven_days','one_day','expired')),
 created_at timestamptz not null default now(),
 state text not null default 'pending' check(state in ('pending','processing','sent','failed','cancelled')),
 attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
 lease uuid, lease_until timestamptz, provider_id text,
 unique(shop_id,rental_expires_at,kind)
);
alter table public.market_rental_reminder_jobs enable row level security;
revoke all on public.market_rental_reminder_jobs from public,anon,authenticated;
grant all on public.market_rental_reminder_jobs to service_role;
create or replace function public.market_claim_rental_reminders() returns setof public.market_rental_reminder_jobs
language plpgsql security definer set search_path='' as $$
begin
 -- One current stage per run: no burst of backdated notices when first enabled.
 insert into public.market_rental_reminder_jobs(shop_id,owner_wallet,recipient,rental_expires_at,kind)
 select s.id,s.owner_wallet,c.email,s.rental_expires_at,
 case when s.rental_expires_at<=now() then 'expired' when s.rental_expires_at<=now()+interval '1 day' then 'one_day' else 'seven_days' end
 from public.market_shops s join public.market_alert_contacts c on c.shop_id=s.id and c.owner_wallet=s.owner_wallet
 where s.access_status='active' and not s.moderation_suspended and s.rental_expires_at between now()-interval '7 days' and now()+interval '7 days'
 and c.enabled and c.rental_reminders and c.verified_at is not null and c.email is not null
 on conflict(shop_id,rental_expires_at,kind) do nothing;
 update public.market_rental_reminder_jobs j set state='cancelled',lease_until=null
 where j.state in ('pending','processing') and not exists (
 select 1 from public.market_shops s join public.market_alert_contacts c on c.shop_id=s.id and c.owner_wallet=s.owner_wallet
 where s.id=j.shop_id and s.owner_wallet=j.owner_wallet and s.access_status='active' and not s.moderation_suspended
 and s.rental_expires_at=j.rental_expires_at and c.enabled and c.rental_reminders and c.verified_at is not null and c.email=j.recipient
 and j.kind=case when s.rental_expires_at<=now() then 'expired' when s.rental_expires_at<=now()+interval '1 day' then 'one_day' else 'seven_days' end);
 update public.market_rental_reminder_jobs set state='failed',lease_until=null where state in ('pending','processing') and created_at<now()-interval '20 hours';
 return query with candidates as (
 select id from public.market_rental_reminder_jobs where created_at>now()-interval '20 hours' and attempts<8
 and ((state='pending' and next_attempt_at<=now()) or (state='processing' and lease_until<now()))
 order by created_at limit 25 for update skip locked
 ) update public.market_rental_reminder_jobs j set state='processing',lease=gen_random_uuid(),lease_until=now()+interval '5 minutes',attempts=j.attempts+1 from candidates c where j.id=c.id returning j.*;
end $$;
revoke all on function public.market_claim_rental_reminders() from public,anon,authenticated;
grant execute on function public.market_claim_rental_reminders() to service_role;
commit;
select to_regclass('public.market_rental_reminder_jobs') is not null as rental_reminders_ready;
