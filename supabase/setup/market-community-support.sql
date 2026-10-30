begin;
create table public.market_support_booths (
 scope text not null check(scope in ('preview','live')),
 id smallint not null check(id in (1,2)),
 title text not null check(length(title) between 1 and 100),
 description text not null default '' check(length(description)<=1500),
 image_path text,
 cleared_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(scope,id)
);
create table public.market_support_receipts (
 tx_hash text primary key check(tx_hash ~ '^[a-f0-9]{64}$'),
 scope text not null,booth_id smallint not null,
 wallet_address text not null check(wallet_address ~ '^erd1[0-9a-z]{58}$'),
 herotag text check(length(herotag)<=100),
 public_name boolean not null default false,
 bonez_atomic numeric(78,0) not null check(bonez_atomic>0),
 egld_atomic numeric(78,0) not null check(egld_atomic>0),
 purchased_at timestamptz not null,
 created_at timestamptz not null default now(),
 foreign key(scope,booth_id) references public.market_support_booths(scope,id)
);
create index market_support_board_idx on public.market_support_receipts(scope,booth_id,purchased_at desc) where public_name;
create table public.market_support_actions (
 id uuid primary key default gen_random_uuid(),scope text not null,booth_id smallint not null,
 actor_wallet text not null,action text not null check(action in ('edit','image','clear')),
 created_at timestamptz not null default now()
);
alter table public.market_support_booths enable row level security;
alter table public.market_support_receipts enable row level security;
alter table public.market_support_actions enable row level security;
revoke all on public.market_support_booths,public.market_support_receipts,public.market_support_actions from anon,authenticated;
grant select,insert,update on public.market_support_booths,public.market_support_receipts,public.market_support_actions to service_role;
insert into public.market_support_booths(scope,id,title,description)
select scope,id,'BONEZ Booth '||id,'More BONEZ. More community. Buy BONEZ for your wallet and say hello on the supporter board.' from unnest(array['preview','live']) scope cross join generate_series(1,2) id;
create function public.market_support_board(p_scope text,p_booth smallint,p_offset integer default 0)
returns table(wallet_address text,herotag text,last_purchase timestamptz,total_bonez text)
language sql stable security invoker set search_path=public as $$
 select r.wallet_address,(array_agg(r.herotag order by r.purchased_at desc))[1],max(r.purchased_at),sum(r.bonez_atomic)::text
 from market_support_receipts r join market_support_booths b on b.scope=r.scope and b.id=r.booth_id
 where r.scope=p_scope and r.booth_id=p_booth and r.public_name and r.purchased_at>b.cleared_at
 group by r.wallet_address order by sum(r.bonez_atomic) desc,max(r.purchased_at) desc,r.wallet_address limit 51 offset greatest(0,p_offset)
$$;
revoke all on function public.market_support_board(text,smallint,integer) from public,anon,authenticated;
grant execute on function public.market_support_board(text,smallint,integer) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('market-support-images','market-support-images',false,2097152,array['image/jpeg','image/png','image/webp']);
commit;
