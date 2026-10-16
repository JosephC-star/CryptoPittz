# Storefront rental implementation

Status: review and key-verification foundation. Payment signing, broadcasting, receipt submission and rental activation are intentionally disabled. The quote endpoint is authenticated and read-only, and currently serves existing active assigned merchants through their merchant session.

Confirmed terms: standard upfront BONEZ prices are 60,000 for one month, 330,000 for six months, and 600,000 for twelve months. Regular Meta-Key holders receive a 50% discount (30,000 / 165,000 / 300,000). Diamond Key holders owe no booth rent. Key benefits are not stacked. Product price options are unrelated to this rental policy.

BONEZ is BONEZ-ff9a73 with 6 decimals. The only payment destination is the existing verified Pittensor team burn-pile wallet. Rental receipts must be categorized separately from voluntary contributions. A receipt is not proof of an actual token burn.

Private exceptions are evaluated from backend-owned storefront access records. Existing complimentary/test access remains no-charge; an optional private rental_fee_waived flag can carry a permanent exception when the billing schema is introduced. Personal status and waiver reasons must not be shown publicly. Existing access is preserved during this work.

Key verification discovers holdings only in CPMK-8d8a01 and verifies balances and the on-chain Type attribute using the mainnet gateway. Type=Diamond grants the Diamond tier, Type=Hodler the regular Meta-Key tier. Names, artwork, client declarations and indexer ownership alone are insufficient. Requests fail closed on verification errors. Only wallet-held keys are currently checked; staked/delegated keys are not assumed to be eligible.

The quote display cannot submit payments. The payment spec and receipt validator pin token, six-decimal amount, destination, review nonce, transaction hash, time window, success status and exact transfer event.

Remaining before collection can be enabled:
- Persist quotes and transaction intents in private tables with unique transaction hashes and atomic, idempotent rental activation. Never grant rent twice for one receipt.
- Add reviewed wallet signing using existing guardian-aware contribution checks, unsigned simulation, balance and nonce checks, review expiry, and durable uncertain-submission recovery. No automatic rebroadcast.
- Recheck quote and key eligibility immediately before signing/broadcast, and verify the canonical mainnet receipt on the backend before activating the exact storefront/term.
- Support assigned pending/expired stores without granting editing rights before activation. Add secure new-booth enrollment separately from existing-store renewal.
- Decide and enforce continuing Diamond eligibility when a key is transferred. Paid discounted terms should not be silently revoked or repriced after payment.
- Define UTC calendar-month expiry and month-end clamping, renewal extension, and no-charge activation semantics. Preserve private fee exemptions and moderation suspensions.
- Complete unsigned simulation and hands-on wallet tests before enabling any payment.
