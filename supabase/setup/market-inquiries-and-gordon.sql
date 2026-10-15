-- Run this in a NEW Supabase SQL Editor query before the live launch.
-- Adds durable inquiry limits and safely assigns Gordon's complimentary booth.
begin;

create table if not exists public.market_inquiry_rate (
  bucket text primary key,
  used bigint not null default 0,
  expires_at timestamptz not null
);
create index if not exists market_inquiry_rate_expiry_idx
  on public.market_inquiry_rate(expires_at);
alter table public.market_inquiry_rate enable row level security;
revoke all on public.market_inquiry_rate from anon, authenticated;
grant select, insert, update, delete on public.market_inquiry_rate to service_role;

create or replace function public.market_reserve_inquiry(
  ip_hash text, email_hash text, shop_key uuid
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  ip_bucket text;
  email_bucket text;
  ip_count bigint;
  email_count bigint;
begin
  if ip_hash !~ '^[0-9a-f]{64}$' or email_hash !~ '^[0-9a-f]{64}$'
     or shop_key is null then
    return false;
  end if;
  delete from public.market_inquiry_rate where expires_at < now();
  ip_bucket := 'ip:' || ip_hash || ':' || to_char(date_trunc('hour', now() at time zone 'UTC'), 'YYYYMMDDHH24');
  email_bucket := 'email:' || shop_key::text || ':' || email_hash || ':' || to_char(now() at time zone 'UTC', 'YYYYMMDD');
  insert into public.market_inquiry_rate (bucket, used, expires_at)
    values (ip_bucket, 1, now() + interval '2 days')
    on conflict (bucket) do update set used = public.market_inquiry_rate.used + 1
    returning used into ip_count;
  insert into public.market_inquiry_rate (bucket, used, expires_at)
    values (email_bucket, 1, now() + interval '2 days')
    on conflict (bucket) do update set used = public.market_inquiry_rate.used + 1
    returning used into email_count;
  return ip_count <= 5 and email_count <= 5;
end;
$$;
revoke all on function public.market_reserve_inquiry(text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.market_reserve_inquiry(text, text, uuid)
  to service_role;

do $$
declare current_owner text;
begin
  select owner_wallet into current_owner
    from public.market_shops where booth_number = 1 for update;
  if not found then raise exception 'Booth 01 is missing. Run the initial market setup first.'; end if;
  if current_owner is not null
    and current_owner <> 'erd1uugf4thxgqv3m8jju2m9rc5vnx4yetk22ch8fddnzuddyv9fzgnscd3ynn' then
    raise exception 'Booth 01 already has a different owner. No changes made.';
  end if;
  if exists(select 1 from public.market_shops
    where owner_wallet = 'erd1uugf4thxgqv3m8jju2m9rc5vnx4yetk22ch8fddnzuddyv9fzgnscd3ynn'
      and booth_number <> 1) then
    raise exception 'This wallet is already assigned elsewhere. No changes made.';
  end if;
  if exists(select 1 from public.market_shops
    where booth_number = 1 and access_status not in ('pending','test')) then
    raise exception 'Booth 01 has a different access state. No changes made.';
  end if;
  update public.market_shops
    set owner_wallet = 'erd1uugf4thxgqv3m8jju2m9rc5vnx4yetk22ch8fddnzuddyv9fzgnscd3ynn',
        access_status = 'test'
    where booth_number = 1;
end $$;

commit;
select booth_number, name, access_status, owner_wallet is not null as wallet_assigned,
  to_regclass('public.market_inquiry_rate') is not null as inquiry_setup_ready
from public.market_shops where booth_number = 1;
