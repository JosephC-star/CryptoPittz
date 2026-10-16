-- Admin moderation setup. Creates NO admin accounts.
-- Admin wallet assignments will be supplied in a separate reviewed query.
begin;
alter table public.market_shops
  add column if not exists moderation_suspended boolean not null default false,
  add column if not exists moderation_reason text;
alter table public.market_products
  add column if not exists moderation_hidden boolean not null default false,
  add column if not exists moderation_reason text;

create table if not exists public.market_admins (
  wallet_address text primary key check (wallet_address ~ '^erd1[0-9a-z]{58}$'),
  display_name text not null check (length(display_name) between 1 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.market_admin_sessions (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null references public.market_admins(wallet_address),
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.market_moderation_log (
  id uuid primary key default gen_random_uuid(),
  actor_wallet text not null references public.market_admins(wallet_address),
  target_type text not null check (target_type in ('shop','product')),
  target_id uuid not null,
  action text not null check (action in ('hide','restore','suspend','reopen')),
  reason text not null check (length(btrim(reason)) between 5 and 1000),
  previous_state boolean not null,
  new_state boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists market_moderation_log_created_idx
  on public.market_moderation_log(created_at desc);
alter table public.market_admins enable row level security;
alter table public.market_admin_sessions enable row level security;
alter table public.market_moderation_log enable row level security;
revoke all on public.market_admins, public.market_admin_sessions, public.market_moderation_log
  from anon, authenticated;
grant select, insert, update, delete on public.market_admins, public.market_admin_sessions to service_role;
grant select, insert on public.market_moderation_log to service_role;

create or replace function public.market_moderate(
  actor text, kind text, target uuid, action_name text, explanation text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare old_state boolean; new_state boolean;
begin
  if not exists(select 1 from public.market_admins where wallet_address = actor and active)
    then raise exception 'Admin access is required.'; end if;
  if explanation is null or length(btrim(explanation)) not between 5 and 1000
    then raise exception 'A reason of 5 to 1000 characters is required.'; end if;
  if kind = 'shop' and action_name in ('suspend','reopen') then
    select moderation_suspended into old_state from public.market_shops where id = target for update;
    if not found then raise exception 'Storefront not found.'; end if;
    new_state := action_name = 'suspend';
    if new_state = old_state then raise exception 'This storefront is already in that state.'; end if;
    update public.market_shops set moderation_suspended = new_state, moderation_reason = btrim(explanation)
      where id = target;
  elsif kind = 'product' and action_name in ('hide','restore') then
    select moderation_hidden into old_state from public.market_products where id = target for update;
    if not found then raise exception 'Product not found.'; end if;
    new_state := action_name = 'hide';
    if new_state = old_state then raise exception 'This product is already in that state.'; end if;
    update public.market_products set moderation_hidden = new_state, moderation_reason = btrim(explanation), updated_at = now()
      where id = target;
  else
    raise exception 'Invalid moderation action.';
  end if;
  insert into public.market_moderation_log (actor_wallet, target_type, target_id, action, reason, previous_state, new_state)
    values (actor, kind, target, action_name, btrim(explanation), old_state, new_state);
  return jsonb_build_object('updated', true, 'action', action_name);
end;
$$;
revoke all on function public.market_moderate(text, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.market_moderate(text, text, uuid, text, text) to service_role;
commit;
select count(*) as assigned_admin_wallets from public.market_admins where active;

-- Activate only the two explicitly supplied and checksum-validated admin wallets.
begin;
insert into public.market_admins (wallet_address, display_name, active)
values
  ('erd1j5afnnskrvrme5j44u2drddw7tq9masxm0p3spt7dj4d8xac30aqsqh66n', 'Joe', true),
  ('erd1xnw82n5cdpzt3lu9yvu9urhvwfrhkcna9hhl5fc4pap4elc5hkcs85uavh', 'Owner', true)
on conflict (wallet_address) do update
  set display_name = excluded.display_name, active = true;
commit;

select display_name, active, wallet_address
from public.market_admins
where wallet_address in (
 'erd1j5afnnskrvrme5j44u2drddw7tq9masxm0p3spt7dj4d8xac30aqsqh66n',
 'erd1xnw82n5cdpzt3lu9yvu9urhvwfrhkcna9hhl5fc4pap4elc5hkcs85uavh'
)
order by display_name;
