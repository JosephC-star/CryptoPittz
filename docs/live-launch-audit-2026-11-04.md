# PittzStop live launch checks — November 4, 2026

## Passed checks

- HTTP GET checks: 18 public page URLs, including explorer, My Pittz, collector, Dawg Pound, Financial District, Pittensor, swap, merchant access, rentals, admin entrance, Back Booths, market and Playground. Each returned HTML with HTTP 200; the old merchant URL redirects to the stockroom.
- 47 directly referenced same-site asset URLs returned successful HTTP responses.
- Browser checks: homepage, flea market directory, WoodenPunks storefront, stockroom sign-in, rental entry, Back Booths, Financial District, Playground and Bonez Flip entrance. No broken loaded images on the sampled homepage, shop and district views.
- Product inquiry action selects the correct item. Empty inquiry submission is stopped by required name/email/message/consent fields. No live message was sent.
- Live JSON checks: shop directory, featured shop, catalogs, public portfolios for booths 1 and 4, reviews, Back Booth descriptions/board, pool data, existing OneDEX staking data and rental configuration.
- Rentals and key benefits are enabled; a key is optional. Private stockroom, admin, inquiry inbox, email settings and rental-session endpoints reject unauthenticated access.
- Invalid inquiry and review requests are rejected with validation errors; unauthenticated product writes are rejected.
- Supabase project is ACTIVE_HEALTHY. Live health endpoint confirms database and private image buckets are reachable.
- Three merchant email contacts have verified and enabled alerts. Customer inquiry and merchant welcome/signup triggers and dispatcher RPCs are installed.
- The dispatcher is actively calling both notification queues: 1,434 inquiry and 1,433 signup queue calls in the inspected 24-hour log window, all recorded HTTP 200. Latest inspected queue call: 17:51 UTC November 4.
- No pending or processing email jobs at the queue inspection. One historical inquiry job was accepted by the provider October 19. Two historical inquiry jobs remain failed from October 17; they were not replayed.
- Existing contact/support actions are mailto links, not server-submitted contact forms.
- Automated suites for market, email, rentals, support, gallery/media, merchant overview, social sharing and the new market feed passed. Production build passed with existing bundle-size warnings.

## Fixes

1. Homepage introduction still promised automatic Sunday holder payouts, conflicting with the owner's pause. Replace that sentence with the current pause and upcoming in-wallet system status.
2. Browser market lookup received no pair from the Dexscreener endpoint. Replace it with a cached same-origin feed using MultiversX's documented `/mex/pairs/{baseId}/{quoteId}` API. Verify exact pair address, LP token, base/quote identifiers, exchange, active state and numeric prices before displaying. Use base token price, never LP token price. Missing buy/sell and market-cap fields remain unavailable, not zero. Update source attribution.

## Verification limits and next manual check

No wallet signature, payment, rental activation, inventory change, public review or real inquiry was submitted. Private signed-in stockroom workflows were covered by source tests and endpoint access checks, not a fresh signed-in browser session. No claim is made that every game round, external link, responsive breakpoint or wallet flow was exhaustively tested.

The notification worker is running with its email-readiness gate satisfied, but current Resend acceptance and recipient inbox arrival need a fresh controlled test inquiry and recipient confirmation. Existing provider acceptance from October does not establish present-day delivery. Use a clearly labeled test through an agreed merchant, check the private inbox, then confirm that the verified merchant email receives its alert. A merchant signup email also needs a controlled activation to prove the full path; the database trigger is installed, but no new signup was created during this pass.

Staking preview PR 63 stays separate and is not included in this change.
