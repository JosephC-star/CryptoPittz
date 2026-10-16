# Flea Market admin setup

The merchant and inquiry features are live. Admin moderation is staged separately.

1. Run supabase/setup/market-admin-moderation.sql in Supabase. It creates no admin accounts.
2. Obtain Joe's and the owners' public erd1 wallet addresses. Validate checksums and assign only those named wallets through a separate server-side SQL query. Do not infer roles from merchant ownership or Meta-Key holdings.
3. Test wallet signing at /market-admin. Apply a hide and restore, and a suspension and reopening, with reasons. Review the action history.

Public catalog, image access, product inquiries and merchant sessions all enforce moderation state. Inventory, merchant publication state and rental records are preserved. Admin sessions are separate from merchant sessions and expire after one hour. New actions recheck active admin membership. No customer inbox access is granted to the moderation interface.

Rental policy (storefront rent only): standard prepaid BONEZ plans are 60,000 for one month, 330,000 for six months (55,000/month), and 600,000 for twelve months (50,000/month). Regular Meta-Key holders get 50% off: 30,000, 165,000, and 300,000 BONEZ upfront respectively. Diamond Key holders pay no booth rent. Diamond is identified by Type=Diamond within CPMK-8d8a01; the regular displayed key has Type=Hodler. Do not infer the tier from an NFT name alone. No key transfer, consumption, or automatic rental charging is enabled. Merchant product price options are unchanged.


BONEZ rental proceeds: send paid storefront rental BONEZ to the existing verified Pittensor team burn wallet so it joins the burn pile. Reuse the pinned, verified Pittensor destination when implementing payment; do not guess or introduce a different address. Track rental receipts separately from voluntary contributions while including confirmed receipts in the burn-wallet balance. Receiving rent is a contribution to the pending burn pile, not proof of a completed on-chain burn. Rates and durations are confirmed above; paid rental transactions and automated key-benefit checks still need implementation and wallet testing.

Gordon exemption: Booth 01, assigned to erd1uugf4thxgqv3m8jju2m9rc5vnx4yetk22ch8fddnzuddyv9fzgnscd3ynn, has OG owner booth access with its rental fee waived independently of key holdings. Existing complimentary access has no rental expiry. Retain this exemption when paid billing is introduced; it grants no admin role and remains subject to moderation.

Showcase asset: verified public metadata for CPMK-8d8a01-03e6 reports Type=Diamond and the original Diamond.mp4 at https://media.multiversx.com/nfts/asset/QmdfWxGttHn3gC1cdxB8MbC7f5ujmjoRrajVyRLPyFLnXL/Diamond.mp4. Used directly in the key showcase with a poster and playback controls; no generated replacement artwork.
