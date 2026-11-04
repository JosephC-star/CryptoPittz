# In-wallet Pittz rewards — first preview

This branch is an interactive design and economics simulator. It has no wallet authentication, live eligibility result, claim endpoint, scheduled transfer, or deployed reward contract. Do not fund it.

## Confirmed owner inputs

- Exactly 33,000,000 BONEZ dedicated to Pittz rewards.
- Fresh 6.3-year program, with halvings every nine months.
- Vice receives a 20% bonus relative to the same Original tier.
- Wednesday claims through Monday; expired allocated rewards move to an LP reward allocation Tuesday.
- Listed Pittz do not qualify. A minimum two-day holding period is requested.
- LP allocation should reflect both amount and time supplied.
- Purchase bonuses and giveaways use a separate budget.

## Explicit modeling assumptions, not approved rules

- Illustrative launch: Wednesday November 11, 2026 at 00:00 UTC. No launch is scheduled.
- 6.3 average Gregorian years rounded to 2,301 days; exact end-date convention needs confirmation.
- Draft weights: SR 100, Holoz 50, Lego 25, Platinum 12, Gold 6, Silver 3, Bronze 1. Vice weight is exactly 6/5 of Original.
- Denominator uses the announcement's full collection counts. Existing site's rank boundaries differ and must be reconciled against authoritative NFT metadata.
- All 33 million are normalized across the finite program. This yields an initial weekly budget near 423,389 BONEZ, not the old 94,586. It is a proposed recalculation, not an approved emission rate.
- Weekly budgets integrate the time spent on each side of a calendar halving, use integer token units (six decimals), and allocate rounding residuals deterministically. Sum equals the reserve exactly.
- The LP simulator assumes all of a selected week's budget was allocated. It does not silently sweep unallocated or future funds into LP rewards.
- LP token-days illustrate a time integral; production requires transfer-aware, farm-aware accounting over the approved measurement window.

## Decisions before implementation of real allocations

Confirm launch and timezone; calendar end convention; weights and tier/rank mapping; snapshot versus ongoing eligibility; treatment of sales/listings after snapshot; unallocated rewards; eligible LP pool and farm positions; Tuesday LP claim mechanism and expiration; no eligible LP participants; cancellation/correction procedure; administrative control and contract upgrade policy.

## Next implementation stages

1. Build a replayable indexer for NFT transfers and marketplace listing state, including a continuous 48-hour ownership check. Publish auditable weekly allocation manifests and totals. Never treat current wallet balance alone as historical ownership evidence.
2. Add LP transfer/position history for the agreed pool, aggregating beneficial ownership of supported farm positions without double counting.
3. Implement a funded distribution contract with bounded weekly budgets, per-wallet/per-week claim protection, immutable published allocations, timestamp claim windows, and an explicit expiration transition. Choose and disclose who can publish allocation commitments and how indexer errors are corrected before any real funds are deposited.
4. Use devnet tokens to test claims, transfer/listing exclusions, duplicate claims, deadline boundaries, expired reward allocation, zero LP participants, operator outage recovery, and conservation of all funds.
5. Connect verified wallet reads and signed claims to this dashboard; retain a clear distinction between estimates and published claimable amounts.

Automation needs an external transaction sender for publication and expiration handling. Contract time limits must enforce the rules even if that sender is offline. Scheduled code must never hold users' wallet keys.

## Validation

`node --test tests/in-wallet-staking-preview.test.mjs`

`npm run build`
