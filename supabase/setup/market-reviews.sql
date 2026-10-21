-- Additive, rerunnable setup. Run in the existing project's SQL editor before testing reviews.
begin;
create table if not exists public.market_reviews (
 id uuid primary key,
 shop_id uuid not null references public.market_shops(id),
 display_name text not null check(length(display_name) between 2 and 60),
 rating integer not null check(rating between 1 and 5),
 comment text not null check(length(comment) between 10 and 1500),
 status text not null default 'pending' check(status in ('pending','published','hidden')),
 client_hash text not null check(length(client_hash)=64),
 created_at timestamptz not null default now()
);
create index if not exists market_reviews_shop_status_date on public.market_reviews(shop_id,status,created_at desc);
create index if not exists market_reviews_client_date on public.market_reviews(client_hash,created_at);
create table if not exists public.market_review_actions (
 id uuid primary key default gen_random_uuid(),
 review_id uuid not null references public.market_reviews(id),
 actor_wallet text not null,
 previous_status text not null,
 new_status text not null,
 reason text not null check(length(reason) between 5 and 1000),
 created_at timestamptz not null default now()
);
alter table public.market_reviews enable row level security;
alter table public.market_review_actions enable row level security;
revoke all on public.market_reviews,public.market_review_actions from anon,authenticated;
grant select,insert,update,delete on public.market_reviews,public.market_review_actions to service_role;
create or replace function public.market_submit_review(review_id uuid,shop_key uuid,reviewer_name text,review_text text,score integer,client_hash text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if length(client_hash)<>64 then return false; end if;
 perform pg_advisory_xact_lock(hashtextextended(client_hash,19));
 if exists(select 1 from market_reviews r where r.id=review_id) then
  return exists(select 1 from market_reviews r where r.id=review_id and r.shop_id=shop_key and r.client_hash=market_submit_review.client_hash);
 end if;
 if not exists(select 1 from market_shops s where s.id=shop_key and not s.moderation_suspended and (s.access_status='test' or (s.access_status='active' and s.rental_expires_at>now()))) then return false; end if;
 if (select count(*) from market_reviews r where r.client_hash=market_submit_review.client_hash and r.created_at>now()-interval '24 hours')>=3
 or exists(select 1 from market_reviews r where r.shop_id=shop_key and r.client_hash=market_submit_review.client_hash and r.created_at>now()-interval '24 hours') then return false; end if;
 insert into market_reviews(id,shop_id,display_name,rating,comment,client_hash) values(review_id,shop_key,reviewer_name,score,review_text,client_hash);
 return true;
end $$;
create or replace function public.market_review_summary(shop_key uuid)
returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('count',count(*),'average',round(avg(rating),1)) from market_reviews where shop_id=shop_key and status='published';
$$;
create or replace function public.market_moderate_review(actor text,target uuid,next_status text,explanation text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare previous text;
begin
 if not exists(select 1 from market_admins where wallet_address=actor and active) then raise exception 'Admin required'; end if;
 if next_status not in ('published','hidden') or length(trim(explanation)) not between 5 and 1000 then raise exception 'Invalid review action'; end if;
 select status into previous from market_reviews where id=target for update;
 if previous is null then raise exception 'Review missing'; end if;
 update market_reviews set status=next_status where id=target;
 insert into market_review_actions(review_id,actor_wallet,previous_status,new_status,reason) values(target,actor,previous,next_status,trim(explanation));
 return jsonb_build_object('saved',true);
end $$;
revoke all on function public.market_submit_review(uuid,uuid,text,text,integer,text),public.market_review_summary(uuid),public.market_moderate_review(text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.market_submit_review(uuid,uuid,text,text,integer,text),public.market_review_summary(uuid),public.market_moderate_review(text,uuid,text,text) to service_role;
commit;
