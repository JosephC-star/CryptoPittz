# Pittensor monthly burn contributions

## User flow

Regular holders add BONEZ to the team-managed burn wallet:

`erd106gc0ksmtlrarpqrvjhyrv2rt9wawv4u3czx4w7xuj40s5sxpxjqyd94s9`

The team states that it burns from this wallet on the first of each month. The page transfers tokens to that wallet; it does not execute or automate that monthly burn. The receipt and furnace celebration say contribution confirmed / monthly burn pending, never immediate token destruction. The live wallet balance is labelled as the team wallet's BONEZ balance, not a website-only contribution total. The token's all-time burned amount and supply remain separate live metrics.

Users enter normal BONEZ units. `1000` and `1000.000000` both encode `1000000000` atomic units. The review shows the full fixed destination, contribution amount, mainnet, maximum network fee, and the fact that token control transfers to the team with no rewards or tokens returned.

## Transaction and receipt

The only new signed operation is `ESDTTransfer@424f4e455a2d666639613733@<atomic amount hex>`, EGLD value0, receiver fixed above. Base gas limit500000; existing guardian handling adds50000 when applicable. The team wallet is rejected as its own contribution sender.

Checks retain mainnet/account context, token identity/decimals/paused state, liquid token and fee balances, nonce, guardian protection, review expiry, strict signed-payload verification, simulation before review and before/after signing, and pending-submission protection before broadcast. Both simulated shards must succeed. The event must match the sender, BONEZ identifier, empty fungible nonce, exact atomic amount, and the recipient's public-key topic.

A contribution is confirmed only when the successful indexed transaction matches its sender, destination, value, data, and exact ESDTTransfer log. Unverified successful receipts stay blocked and are polled; definitive failures show their status. No automatic rebroadcast occurs. The existing pending-session key is retained so previous direct-burn transactions cannot be silently forgotten; legacy receipts are handled separately without a contribution celebration. Direct burning is no longer offered to regular users.

## Verification on 2026-10-13

- The provided address's Bech32 checksum and32-byte public key were verified. Its mainnet account exists and BONEZ metadata lists its ESDTRoleLocalBurn role.
- A read-only mainnet simulation transferred one atomic unit from an ordinary holder to the configured recipient. With that holder's active guardian fields, sender and receiver shards both succeeded and emitted the exact expected transfer event. No transaction was signed, sent or broadcast; no tokens moved.
- An existing historical incoming BONEZ transaction to the recipient passed the same strict contribution receipt checker with the API's real logs.
- Tests cover exact unit conversion, recipient binding, self-transfer rejection, both-shard success, token/sender/amount/recipient topic matching, rejection of errors and burn events, and failure/pending/unrelated receipts.
- The application compiles. Netlify preview browser access remains team-protected; signing and receipt display through the actual UI still need a small contributor-wallet test before production launch.

## Primary references

- https://docs.multiversx.com/tokens/fungible-tokens/ — fungible transfers and recommended buffered gas limit.
- https://docs.multiversx.com/developers/event-logs/esdt-events/ — ESDTTransfer sender and token/nonce/amount/recipient topics.
