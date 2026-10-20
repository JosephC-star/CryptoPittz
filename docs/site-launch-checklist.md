# The PittzStop — site-wide launch checklist

Internal target: November 1, 2026 for the entire site, including the flea market. This is a planning date, not a public announcement or scheduled deployment. Changes remain in preview until approved. Unchecked items require review; a build passing does not establish that they work live.

## Content and navigation

- [ ] Read every page for spelling, consistent names, current descriptions, and clear calls to action.
- [ ] Check desktop/mobile navigation, logo/home links, footer links, back buttons and section anchors.
- [ ] Test external destinations and confirm they show the intended content.
- [ ] Remove unused links, empty boxes, duplicate sections and prototype controls; complete or clearly label retained coming-soon features.
- [ ] Confirm official contact Cryptopittz69@gmail.com and separate technical-support contact are correct and monitored.
- [ ] Review link-preview images, titles and descriptions for the homepage and shared storefronts.

## Wallets, NFTs and marketplace

- [ ] Check connect/disconnect, account switching and supported mobile/desktop wallet paths, including guarded wallets where available.
- [ ] Check Explorer/My Pittz search, traits, pagination, collapsible sections and large wallets.
- [ ] Check listing source, price/currency display and unavailable/sold listings.
- [ ] Review purchase/list/cancel paths, saved transaction status, reveal, downloads and sharing. Any real transaction requires the wallet owner’s deliberate approval.
- [ ] Confirm unfinished purchase integrations are hidden or clearly unavailable.

## Financial District and Pittensor

- [ ] Verify balances, token units, fees, quote expiration and transaction outcome messages for swap, staking and liquidity controls.
- [ ] Check position values, withdraw/unstake/reinvest routes and pending/failed transaction states.
- [ ] Confirm deposit destination and burn-pile wording; distinguish adding to the pile from executing a burn.

## Games

- [ ] Play each included game on desktop and mobile; check controls, scrolling, sound settings, saves and restart behavior.
- [ ] Verify game names and in-game Bonez wording are consistent.
- [ ] Clearly separate in-game Bonez from real BONEZ. Keep unfinished real-wager functionality unavailable until separately ready and approved.

## Flea market

- [ ] Review shop directory, category/search results, portfolio versus stock, empty/error states and shop links.
- [ ] Test merchant setup, inventory editing, publishing, images, banner fitting and bounded galleries.
- [ ] Send an actual inquiry and check private inbox, reply route and notification email.
- [ ] Confirm each merchant’s prices, payment methods, delivery/pickup, turnaround, returns and cancellation information.
- [ ] Review rental prices, key benefits, expiry dates, renewal, saved receipt recovery and admin moderation.
- [ ] Confirm no rental reminder emails or setup controls remain; renewal dates stay on screen.

## Final release

- [ ] Review phone, tablet and desktop layouts, keyboard navigation, image loading, video/music controls and reduced-motion behavior.
- [ ] Check production configuration and preview/production differences without exposing secrets.
- [ ] Run appropriate automated checks and build; review remaining failures and known limitations.
- [ ] Obtain owner approval of the final preview and launch scope.
- [ ] Publish the approved changes, then check key live-domain paths and inquiry delivery.
- [ ] Keep a known working release available for rollback.

## Pass 1 — content, routes and startup (October 19)

Completed in preview source:

- [x] Filled the homepage Contact panel with the official team email and separate technical support route.
- [x] Renamed remaining authored Arcade menu/game labels to Playground or Game Sound; retained internal route/class names to preserve bookmarks and styling.
- [x] Corrected the homepage Pittensor card to open /pittensor/ and describe adding to the monthly burn pile.
- [x] Added a branded homepage title, description and Open Graph/Twitter metadata using the existing CryptoPittz logo. The actual social-platform crop is still unverified.
- [x] Added page-specific browser titles for the Financial District, Pittensor, swap and merchant routes while preserving server-generated shop titles.
- [x] Added a visible retry/support message if wallet SDK startup fails, replacing a blank root; added a no-JavaScript notice.
- [x] Redirected the obsolete merchant demo to the real merchant backroom and added the bookmarked trailing-slash rental route.
- [x] Explorer/Traits navigation now opens collapsed Explorer content before scrolling.
- [x] Authored static route/anchor/asset audit: 65 unique local references resolve. Existing market audit: 73 authored references resolve. Compiled playground script syntax checks pass.
- [x] All 234 automated tests pass; Vite build succeeds (existing large-chunk warning remains).

Visual review was attempted but the preview opens Netlify's “This site is private” team sign-in screen in the available browser. No preview authentication was performed. Source audits do not verify responsive layout, dynamic/API links, third-party content, mail delivery or wallet transactions. The broader checkboxes above remain pending until those checks are actually completed.

Next hands-on pass: mobile/desktop navigation and modal layout, wallet connect/disconnect and account switching, NFT listing/purchase recovery, financial tool displays, one full game round per cabinet, and a merchant inquiry. Keep the Playground's existing WORK IN PROGRESS label until the owner confirms release scope. No live financial transaction, inquiry email or production deployment was performed in this pass.


## Pass 2 — transaction state and recovery

Completed in preview source:

- [x] Swap, staking and liquidity UI confirmation waits until the carrier transaction succeeds and cross-shard results are no longer pending.
- [x] Staking/liquidity module guards also wait for those results before clearing their previous-transaction lock.
- [x] Reinvestment rejects a reward claim whose cross-shard results are still pending.
- [x] Failed liquidity receipts keep their Explorer link; a terminal failure releases editing controls for a fresh reviewed attempt.
- [x] Pending swap/staking controls cannot clear the in-page receipt through amount/action/refresh changes.
- [x] Swap/liquidity clear the prior account’s displayed receipt and confirmation when accounts change; prepared rental transfers clear on wallet/session/intent changes. Core transaction functions already recheck the current wallet before signing/broadcast.
- [x] Added receipt-state regression tests, including successful carrier transactions with pending cross-shard results, and expanded the reinvestment rejection test.
- [x] All 237 automated tests pass; build and static route/asset audit pass.

These checks are not live financial execution tests. No transaction was signed or broadcast. Pending UI state in swap/staking/liquidity is not a new durable transaction journal and can be lost when reloading or leaving the panel; use wallet history/Explorer before another action. Rental submissions already reserve a signed hash on the backend before broadcast. Next hands-on checks: switch accounts before approving a review, reject a wallet request, observe pending/failure/success receipts, verify position refresh and reinvest claim→stake, and reload a saved rental submission without paying twice. Mobile layout, guarded wallets and delivery of actual merchant inquiry email remain pending. The preview’s Netlify team sign-in barrier is unchanged.
