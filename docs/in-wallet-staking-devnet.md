# In-wallet claims devnet prototype

This prototype follows the browser-local mock claim test. The snapshot publisher remains trusted to validate the direct-wallet 48-hour rule and publish the correct allocations. The contract enforces funded cycle budgets, immutable per-wallet allocations, claim windows, and one claim per wallet per cycle.

## Completed locally

- Rust contract pinned to MultiversX framework 0.66.3.
- Seven MultiversX VM scenario tests exercise token transfers, duplicate protection, deadline boundaries, rollback, budget limits, owner access and cycle isolation.
- WebAssembly built with imports checked against execution interface 1.5.
- Unsigned claim preparation reads the devnet chain, contract, configured token, wallet allocation, receipt status, claim window and fee balance.
- Devnet call-plan builder uses two explicitly supplied test wallets and a ten-minute claim window.
- Node tests cover address checksum validation, devnet chain guards, real BONEZ identifier rejection, insufficient test EGLD and duplicate claims.

Live wallet signing and on-chain devnet execution remain pending. The existing mock page remains a browser-local simulator. The new scripts prepare unsigned devnet inputs.

## Network and funding inputs

Use a dedicated wallet on MultiversX devnet, funded with test EGLD from the devnet faucet. A second devnet wallet exercises independent claims. Signing stays in the holder's wallet or local signing tool. Public wallet addresses are sufficient for preparing the test plan.

Issue a six-decimal fungible token with ticker PITTZTEST. The deployed contract rejects other tickers, including BONEZ-ff9a73. Deploy the artifact on chain D using the issued PITTZTEST token identifier as its single init argument. Use readable, non-upgradeable code metadata for this disposable test instance.

The plan funds 100 PITTZTEST split 60/40 between the two supplied test wallets. These are synthetic transfer-test amounts. The full 823-wallet rehearsal continues to validate the real practice allocations separately.

## Reproduce local validation

From the repository root:

    cargo test --manifest-path contracts/pittz-claims/Cargo.toml --locked
    cd contracts/pittz-claims/meta
    cargo run --locked -- build

The build writes ABI, WASM and mxsc files under contracts/pittz-claims/output. wasm-opt was unavailable in the initial environment, so the tested WASM build is unoptimized by that optional tool.

From the repository root:

    node scripts/test-devnet-claim.mjs
    node scripts/build-devnet-claim-plan.mjs OWNER_WALLET SECOND_TEST_WALLET CONTRACT PITTZTEST-xxxxxx

The plan contains readable transaction data strings. It deliberately omits nonce and signature. Refresh network state and nonce for each transaction and wait for confirmed success before continuing. Publish and seal before the displayed opening, then claim during the ten-minute window. If setup runs late, create a fresh cycle in a fresh disposable test instance.

    node scripts/prepare-devnet-claim.mjs WALLET CONTRACT PITTZTEST-xxxxxx 1

The claim preparer outputs base64 transaction data for a zero-value, unsigned chain-D transaction. The wallet signs and broadcasts after review. Recheck the contract receipt after a timeout before retrying. On-chain duplicate protection remains authoritative.

## On-chain acceptance checks

1. Confirm contract reward token, budget, manifest hash, allocations and sealed state against the reviewed plan.
2. Confirm the first successful claim transfers exactly 60 PITTZTEST and marks the caller claimed.
3. Retry that claim and verify rejection with balances unchanged.
4. Verify a wallet outside the published allocations cannot claim.
5. Leave the other 40 PITTZTEST unclaimed for an expiration test. At the exclusive deadline, verify a claim fails and expireCycle records the remaining 40.
6. Use a fresh cycle to claim both allocations and verify zero expired amount.
7. Confirm claimed plus remaining or expired equals the funded budget.

Expired test funds remain in the contract. No withdrawal or LP destination is implemented until that policy is settled. This prototype has no external contract audit and no live devnet transaction receipts yet.
