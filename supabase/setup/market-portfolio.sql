-- Run once in the existing PittzStop Supabase SQL editor. Safe to rerun.
begin;
create table if not exists public.market_portfolio (
 shop_id uuid not null references public.market_shops(id),
 slot integer not null check(slot between 1 and 6),
 title text not null check(length(trim(title)) between 1 and 60),
 caption text not null default '' check(length(caption)<=1500),
 image_path text not null,
 status text not null default 'draft' check(status in ('draft','published')),
 updated_at timestamptz not null default now(),
 primary key(shop_id,slot)
);
alter table public.market_portfolio enable row level security;
revoke all on public.market_portfolio from public,anon,authenticated;
grant select,insert,update,delete on public.market_portfolio to service_role;
commit;
