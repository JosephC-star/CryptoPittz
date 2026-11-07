create or replace function public.market_support_board(p_scope text,p_booth smallint,p_offset integer default 0)
returns table(wallet_address text,herotag text,last_purchase timestamptz,total_bonez text,total_usd_cents text)
language sql stable security invoker set search_path=public as $$
 select r.wallet_address,(array_agg(r.herotag order by r.purchased_at desc))[1],max(r.purchased_at),sum(r.bonez_atomic)::text,sum(r.usd_cents)::text
 from market_support_receipts r join market_support_booths b on b.scope=r.scope and b.id=r.booth_id
 where r.scope=p_scope and r.booth_id=p_booth and r.public_name and r.purchased_at>b.cleared_at
 group by r.wallet_address order by sum(r.bonez_atomic) desc,max(r.purchased_at) desc,r.wallet_address limit 51 offset greatest(0,p_offset)
$$;
