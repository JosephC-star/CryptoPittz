-- PittzStop Market: initial backend setup.
-- Run once in the Supabase SQL Editor. Safe to rerun unchanged.
-- Wallet login and authorization will be enforced by server functions.
begin;

create table if not exists public.market_shops (
  id uuid primary key default gen_random_uuid(),
  booth_number integer not null unique check (booth_number > 0),
  name text not null check (length(name) between 1 and 120),
  description text not null default '',
  owner_wallet text unique check (owner_wallet ~ '^erd1[0-9a-z]{58}$'),
  inquiry_email text,
  access_status text not null default 'pending'
    check (access_status in ('pending','test','active','suspended')),
  rental_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.market_products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.market_shops(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  description text not null default '' check (length(description) <= 5000),
  price numeric(36,18) check (price > 0),
  currency text not null default 'USD' check (currency in ('USD','EGLD','BONEZ')),
  quantity integer not null default 1 check (quantity >= 0),
  made_to_order boolean not null default false,
  delivery text not null default 'Arrange with merchant',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists market_products_shop_status_idx
  on public.market_products(shop_id, status);

create table if not exists public.market_inquiries (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.market_shops(id),
  product_id uuid references public.market_products(id) on delete set null,
  customer_name text not null check (length(customer_name) between 1 and 120),
  customer_email text not null check (length(customer_email) between 3 and 320),
  message text not null default '' check (length(message) <= 5000),
  reference_image_path text,
  status text not null default 'new' check (status in ('new','read','closed')),
  created_at timestamptz not null default now()
);
create index if not exists market_inquiries_shop_created_idx
  on public.market_inquiries(shop_id, created_at desc);

create table if not exists public.market_login_challenges (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null check (wallet_address ~ '^erd1[0-9a-z]{58}$'),
  nonce_hash text not null unique,
  origin text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.market_sessions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.market_shops(id) on delete cascade,
  wallet_address text not null check (wallet_address ~ '^erd1[0-9a-z]{58}$'),
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists market_sessions_expiry_idx
  on public.market_sessions(expires_at);

-- No browser role can read or write these records directly.
-- The backend must verify wallet identity AND shop permission on every request.
alter table public.market_shops enable row level security;
alter table public.market_products enable row level security;
alter table public.market_inquiries enable row level security;
alter table public.market_login_challenges enable row level security;
alter table public.market_sessions enable row level security;

revoke all on table public.market_shops, public.market_products,
  public.market_inquiries, public.market_login_challenges, public.market_sessions
  from anon, authenticated;
grant select, insert, update, delete on table public.market_shops, public.market_products,
  public.market_inquiries, public.market_login_challenges, public.market_sessions
  to service_role;

-- Photos stay private. Backend will issue appropriate short-lived URLs.
-- Product paths will be scoped by shop; inquiry reference images remain private.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('market-product-images', 'market-product-images', false, 5242880,
   array['image/jpeg','image/png','image/webp']),
  ('market-inquiry-references', 'market-inquiry-references', false, 5242880,
   array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Reserve Gordon's booth without guessing his wallet or activating a rental.
insert into public.market_shops (booth_number, name, description)
values (1, 'GordonCrypto / Stache Rugs',
  'Hand-tufted rugs, Pittz-inspired creations, and custom work.')
on conflict (booth_number) do nothing;

commit;

-- Expected: Booth 01, pending access, wallet_assigned = false.
select booth_number, name, access_status,
       owner_wallet is not null as wallet_assigned
from public.market_shops where booth_number = 1;
