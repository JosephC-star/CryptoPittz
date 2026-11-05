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

## Historical snapshot dry run · October 28, 2026

The replay cutoff was Wednesday October 28 at 05:00 UTC (midnight Central). The continuous custody window began October 26 at 05:00 UTC. The following are sample outcomes based on token-specific logs, observed ownership and the indexed history returned for these IDs. A positive custody result remains provisional until marketplace coverage is verified. The replay used the working rule that an actual return from escrow restarts the 48-hour clock.

| OG nonce | Replay result | Evidence |
| --- | --- | --- |
| `01` | Held through the 48-hour window in the returned history. Provisional eligibility. | The [last matching inbound transfer](https://api.multiversx.com/transactions/a4ca582dc6d0fa87cf41d84849875375e0496b576b1c84a47de21ff023744642?withLogs=true&withResults=true) delivered it to the observed holder ending `dk3pr`. Newer batch rows in the [indexed history](https://api.multiversx.com/nfts/PITTZ-1a4c2d-01/transfers?size=35) did not contain this nonce in the decoded transfer events. |
| `0f8a` | The previous wallet ending `402al` held it at the cutoff. The subsequent transfer does not change the snapshot owner. Provisional eligibility. | A [failed marketplace interaction and return](https://api.multiversx.com/transactions/ac9d5fcf23073b808068a36fc40946b72db4b545d245046efac78f908ced5658?withLogs=true&withResults=true) on October 25 put it back in the wallet more than 48 hours before the cutoff. The [next transfer](https://api.multiversx.com/transactions/7426c1eaa74b90ecda6343c4e5f7ad48eb8196e6abf8b7279a82ba9529196e36?withLogs=true&withResults=true) was processed October 28 at 05:06:40 UTC. |
| `055c` | Held less than 48 hours even before it was relisted. Also in marketplace custody at the cutoff in the returned history. | The [offer settlement](https://api.multiversx.com/transactions/c5ea153ccfef3672e17b03f0d811165c1da412c47e5e836d8ff131c40a3c1c3b?withLogs=true&withResults=true) delivered it October 26 at 10:17:05 UTC, about 42 hours and 43 minutes before the cutoff. The [listing](https://api.multiversx.com/transactions/afd481d5cac0462c3d71ac2a7a5b491bedb665edde87e24b348517170ceb5231?withLogs=true&withResults=true) moved it into escrow nine minutes later. |
| `1964` | Ineligible at the cutoff in the returned history. This also exercises the delisting edge case. | The [withdrawal](https://api.multiversx.com/transactions/a0951ce17f53b245090a9ef07221732966875d908b60d29204e0f5600fbaae35?withLogs=true&withResults=true) returned it October 27 at 11:20:48 UTC. It was [relisted](https://api.multiversx.com/transactions/0bd4910f4dfc9d576552e6b7dbb379f4ad62b3146a55c8f7d80684deea723e18?withLogs=true&withResults=true) at 11:24:14 UTC. At an intermediate checkpoint of 11:22 UTC the NFT was back in the wallet but had only been there for 72 seconds. |
| `02f6` | Excluded by the wallet custody rule. | The [August listing and transfer](https://api.multiversx.com/transactions/1eebb52c0b1f3cfa56910ea4e3d5df7c28a709132ea9e29ce0127befdb121eb4?withLogs=true&withResults=true) moved it into marketplace escrow. The [indexed history](https://api.multiversx.com/nfts/PITTZ-1a4c2d-02f6/transfers?size=35) showed no later withdrawal or sale, and the observed holder was still the escrow contract. |

Treat parent and destination-shard copies of the same transfer as one movement, using the destination execution when available. A failed parent can still contain token movement and a return in its results. Decode those events before evaluating continuity. The current XOXNO endpoint timed out during this run, and the audit did not establish a complete historical listing feed across venues. Full-collection replay and reconciliation remain required before any allocation can be published.

### Marketplace event follow-up

`python3 scripts/replay-staking-listings.py NFT_ID UTC_CUTOFF TX_JSON...` extracts recognized events from captured MultiversX transaction responses with logs and smart-contract results enabled. It filters by contract, collection and nonce, deduplicates the same event within a parent transaction, and ignores events after the cutoff. Its output is evidence for review. An empty result carries no eligibility verdict.

- OOX auction `12396` for OG `1aee` opened on October 20 at 14:44:58 UTC and closed on purchase at 16:36:42 UTC. The two events use the same auction ID. [Open](https://explorer.multiversx.com/transactions/a8c4acf3a6349223647fbbdeb9ddceaee4bdf4ba480d2a616769eb7f033f94c9) · [Purchase](https://explorer.multiversx.com/transactions/c0cf5da25db90735a16169ed9c1025f1648271f5f46b2a0468fd03a418f0e57e)
- XOXNO withdrew auction `1437325` for OG `1964` and opened auction `1438491` for the same NFT three minutes and 26 seconds later. A historical snapshot between those events sees the withdrawal only. XOXNO also emits distinct close events for [endAuction](https://explorer.multiversx.com/transactions/df338599c3c7a72cea00f171962d9e6b254aaf011a56e2776625bd44bc5070a1) and [returnListing](https://explorer.multiversx.com/transactions/07a0b336cb16efa7c82850f0a726fda798dce286285eaa345d3e4bd27ef77571).
- XOXNO responded on retry for both provisional Pittz. OG `01` returned a null sale record and OG `0f8a` omitted it. The inspected transactions in their replay windows contained no matching recognized listing events. Their historical eligibility remains provisional because the live response and sampled indexed history do not prove complete venue coverage at the cutoff.

The next reconciliation needs a complete event range or verified starting custody anchors and all subsequent movements for both collections. Keep unknown or unsupported marketplace events separate from verified absence of a listing. The evidence reader does not model deadline-only expiry, reconstruct contract state, or publish a payout file.
