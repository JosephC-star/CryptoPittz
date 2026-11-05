# In-wallet Pittz rewards — first preview

This branch is an interactive design and economics simulator. It has no wallet authentication, live eligibility result, claim endpoint, scheduled transfer, or deployed reward contract. Do not fund it.

## Confirmed owner inputs

- Exactly 33,000,000 BONEZ dedicated to Pittz rewards.
- Fresh 6.3-year program, with halvings every nine months.
- Vice receives a 20% bonus relative to the same Original tier.
- Wednesday claims through Monday; expired allocated rewards move to an LP reward allocation Tuesday.
- Listed Pittz do not qualify. Continuous ownership for at least 48 hours is required at the Wednesday snapshot. Subsequent transfers or listings leave that week’s allocation with the snapshot owner.
- LP allocation should reflect both amount and time supplied.
- Purchase bonuses and giveaways use a separate budget.

## Explicit modeling assumptions, not approved rules

- Target first snapshot is November 18, 2026 at 06:00 UTC. The first claim cutoff is November 24 at 06:00 UTC. Weekly boundaries follow midnight America/Chicago and display in UTC.
- 6.3 average Gregorian years rounded to 2,301 days; exact end-date convention needs confirmation.
- Draft weights: SR 100, Holoz 50, Lego 25, Platinum 12, Gold 6, Silver 3, Bronze 1. Vice weight is exactly 6/5 of Original.
- The denominator is the combined weight of eligible NFTs. Collection and nonce identify each NFT, including distinct NFTs with the same rank. Verify the supplied rank ranges against authoritative NFT metadata before launch.
- All 33 million are normalized across the finite program. This yields an initial weekly budget near 423,415 BONEZ, not the old 94,586. It is a proposed recalculation, not an approved emission rate.
- Weekly budgets integrate the time spent on each side of a calendar halving, use integer token units (six decimals), and allocate rounding residuals deterministically. Sum equals the reserve exactly.
- Only expired allocations feed the LP example for BONEZWEGLD-c5db6b. The first LP bonus would follow the first claim week. Unallocated reserves stay separate.
- LP token-days illustrate a time integral; production requires transfer-aware, farm-aware accounting over the approved measurement window.

## Decisions before implementation of real allocations

Verify calendar end convention, tier weights, and NFT data. Decide the policy for empty snapshots, the LP duration bonus, supported LP positions, LP payout and expiration, empty LP periods, correction procedures, and contract administration.

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

## Step 2 data audit · November 5, 2026

Run `python3 scripts/audit-staking-ranks.py` to repeat the read-only collection audit. The 5,310 OG and 1,395 Vice NFTs returned by MultiversX all have one embedded project `Rank-<number>` tag within the owner-supplied tier ranges. The embedded counts exactly match both owner tables. Use those tags for reward tiers and the full identifier for NFT identity. Keep the explorer's display ranks separate.

| Collection | Embedded tier counts, rarest to most common | API ranks differing from embedded ranks |
| --- | --- | --- |
| OG | 4, 15, 50, 494, 786, 1,625, 2,336 | 5,306 |
| Vice | 1, 5, 11, 100, 200, 400, 678 | 1,392 |

For example, OG `PITTZ-1a4c2d-44` has API rank 2 and embedded rank 1. Vice `PITTZVICE-c3ec94-0f` has API rank 3 and embedded rank 2. Using the API rank would also put eight Vice NFTs outside the owner-approved ranges.

### Ownership and listing evidence

- [OG transfer response](https://api.multiversx.com/nfts/PITTZ-1a4c2d-01/transfers?size=5) includes a batch transaction that moved OG nonce `0ae6`, with no OG nonce `01` in the transfer event. [Transaction details](https://api.multiversx.com/transactions/1033c8b49e89eaaef2c85cc34941da9e5ce3eae22e70859cdc8411d2b918cd3c?withLogs=true&withResults=true) expose the actual transfer events. A history row, transaction receiver, or current owner alone cannot establish uninterrupted ownership.
- [A real batch listing transaction](https://api.multiversx.com/transactions/44939f54bb9d9983a1fd7258fa408e8cb7d92f7d10ef7fb09b9a7df272753dbe?withLogs=true&withResults=true) emits token-specific auction events in the smart-contract results, including Vice nonce `01d1` and auction ID `1136462`. The parent call's function name alone cannot identify which NFTs were listed.
- The current OOX feed and XOXNO endpoint both returned auction `1434880` for `PITTZ-1a4c2d-02f6`. XOXNO attributed it to XOXNO and identified a seller distinct from the MultiversX owner address. The same listing can appear in both feeds, so cross-check the venue and auction rather than counting feeds as independent listings. These endpoints describe observed present state and do not establish listing status at a past cutoff.

### Next verification gate

Replay finalized token movements around a past cutoff using decoded token-level events and ownership anchors. Verify marketplace listing creation, cancellation, sale, and expiry against contract-specific events and current records for both OOX and XOXNO. Reconcile conflicting or missing history as unknown and stop publication while any affected eligibility is unresolved. Omitting uncertain NFTs would redistribute their share to others. This audit verifies rank mapping and illustrates the available evidence. Full historical replay and a real weekly eligibility manifest remain open.
