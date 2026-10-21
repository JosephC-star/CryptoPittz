# On-site Pittz offers — PR #33 preview

## Scope

The PittzStop now has its own EGLD offer form, not an OOX redirect. Buyers choose an amount and 1/3/7-day expiry, inspect a simulated review, then approve with their wallet. Each NFT popup also reads the connected wallet's direct offers from the contract, lets buyers withdraw deposits, and lets current intended owners review and accept incoming offers. Listed/contract-held NFTs cannot receive new direct wallet offers through this implementation. Direct EGLD NFT offers only; no SFT, token-denominated, collection, or trait offers.

OOX's existing contract handles escrow and settlement; there is no new PittzStop contract, server signing, customer wallet custody or database. Creating an offer deposits EGLD with the contract. Expiry does not refund it automatically. Withdrawal needs a separate wallet transaction and network fee. Acceptance transfers the NFT to the buyer; royalties and marketplace fees are deducted from the gross offer. No email, push or owner-attention guarantee is added. Incoming offers appear when the owner connects and opens that NFT's offer controls.

## Preview configuration

`VITE_OOX_OFFERS=true` is set only for `feature/oct-21-fixes-preview` by the Netlify deploy-preview command and branch environment. It puts this preview's SDK on mainnet and enables user-approved offer signing. Existing buy/list transactions remain disabled for this preview (`VITE_OOX_TRANSACTIONS=false`). Production offer signing stays disabled until separately approved. Main has not been changed.

This preview uses **real mainnet EGLD** when the user approves an offer. Start with a small amount, then check confirmation and withdrawal. Codex did not sign or broadcast any financial transaction.

## Contract evidence

- Installed official `@oox-marketplace/sdk-core` 0.1.1 bundles the ABI at `src/abi/oox-marketplace.abi.json` in its source map. Its high-level API has no offer helper, but the ABI describes sendOffer, withdrawOffer, acceptOffer, getOffersByOwner, getOffersByNftOwner, and getFullOfferData. The trimmed local ABI preserves those signatures and OfferV2 dependencies; MIT license copied alongside it.
- Official upstream: https://github.com/Paix/oox-sdk . Contract/API docs: https://api.oox.art/docs . The public config returned mainnet, chain 1, and the existing pinned contract.
- Live account and WASM exports confirmed those endpoints at `erd1qqqqqqqqqqqqqpgqwp73w2a9eyzs64eltupuz3y3hv798vlv899qrjnflg`. Code hash is pinned to `Fvr0g7JeYVmRko2shXZwy+c5U9BcCZOmCV9NzFzOuc8=`. A change pauses offer actions until reviewed.
- Read-only getFullOfferData decoded an existing offer and round-tripped its bytes through the official SDK codec.
- Unsigned mainnet sendOffer simulation succeeded for CryptoPittz #1 with 0.000001 EGLD and a one-day deadline, using a public funded address solely in signature-check-disabled simulation. The simulation event matched NFT, amount, buyer, owner and expiry. This did not create an offer.
- A separate unsigned simulation of withdrawing existing offer #32 succeeded and returned its 0.1 EGLD deposit to its recorded creator. That is a legacy non-Pittz offer used only to validate withdrawal behavior; it was not changed. Fixtures are explicitly simulations, not executed transaction receipts.
- Acceptance has payload/event validation and owner/deadline checks, but no live acceptance simulation was possible because no existing direct Pittz offer was present. Each real user's acceptance must first pass a fresh exact simulation; otherwise signing is blocked.

## Checks before signing and broadcasting

Checksum-validated addresses; exact supported NFT identity; mainnet chain; pinned contract code hash; live owner; current on-chain offer; positive exact atomic amount; allowed expiry; confirmed liquid balance plus maximum fee cap; active guardian validation; exact unsigned and signed payload; fresh simulation at review, before signing and after signing; unchanged wallet/nonce/guardian before broadcast. Withdrawal simulations must include the exact refund event. Contract-level business rules are also enforced by simulation.

The signed hash is computed and saved in localStorage before broadcast. Unknown responses retain it and block another offer action until the exact receipt settles. Pending cross-shard results are not considered confirmed. Tracking errors never resend. In-page locking and Web Locks (where supported) prevent concurrent approvals. Recovering offers themselves uses contract queries, so old offers remain discoverable after clearing browser state. Clearing storage does remove the local pending-action journal; consult wallet history first.

## Validation / remaining device acceptance

271 tests pass, including exact offer payloads, actual simulation fixtures, ABI decoding, malformed amounts, incorrect owner, wrong currency/NFT, expired offers, rejected simulation, wallet changes, signed payload mutation, stale reviews, pending cross-shard receipts, unknown broadcast outcomes, tracking failures, and disabled build switches. Preview-mode build and local link audit pass (existing large-chunk warning).

Still required: user hands-on in preview with a small real offer, confirmation, reload recovery, and withdrawal; a cooperative owner acceptance test; Android/iOS xPortal and browser wallet checks; and desktop/mobile layout review. No production merge yet.
