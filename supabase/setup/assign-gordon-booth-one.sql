-- Assign Booth 01 to Gordon. No payment or on-chain transaction.
begin;
do $$
declare current_owner text;
begin
  select owner_wallet into current_owner
  from public.market_shops where booth_number = 1 for update;
  if not found then
    raise exception 'Booth 01 is missing. Run the initial market setup first.';
  end if;
  if current_owner is not null
     and current_owner <> 'erd1uugf4thxgqv3m8jju2m9rc5vnx4yetk22ch8fddnzuddyv9fzgnscd3ynn' then
    raise exception 'Booth 01 already belongs to a different wallet. No changes made.';
  end if;
  if exists(select 1 from public.market_shops
    where owner_wallet = 'erd1uugf4thxgqv3m8jju2m9rc5vnx4yetk22ch8fddnzuddyv9fzgnscd3ynn'
      and booth_number <> 1) then
    raise exception 'This wallet is assigned to another booth. No changes made.';
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

select booth_number, name, access_status, owner_wallet
from public.market_shops where booth_number = 1;
