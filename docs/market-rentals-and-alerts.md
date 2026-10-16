# Rental enrollment and inquiry alerts

Implementation branch: feature/market-rental-alert-connections. Existing shops and inventory keep their existing access. Enrollment, payment collection, key-benefit activation and email sending are disabled unless configured explicitly. No funds were moved during development.

## Database setup

Run `supabase/setup/market-rentals-and-alerts.sql` after the existing initial market and admin schemas. The final result should show `alerts_ready=true` and `rentals_ready=true`. It is safe to rerun and does not change Gordon's assignment or access. New tables and RPCs are private to service_role. Do not expose the Supabase secret in browser variables.

## Email setup

The email connection uses Resend's HTTP API. Create a Resend account, add a sending subdomain such as `notify.thepittzstop.com`, and add the exact DNS records Resend provides at the domain's DNS provider. Wait for Resend to report the domain verified. Do not replace unrelated DNS records.

Create a sending-only API key, preferably restricted to the verified sending domain. In Netlify, Functions scope, set:

| Variable | Value | Secret |
| --- | --- | --- |
| RESEND_API_KEY | The sending API key from Resend | Yes |
| MARKET_EMAIL_FROM | The PittzStop <alerts@notify.thepittzstop.com> (use the actual verified domain) | No |
| MARKET_EMAIL_ALERTS_ENABLED | true | No |

Set these for Production; add Deploy Previews only if testing verification there. Redeploy after environment changes. Never paste the API key into a chat or source code.

Each merchant signs in, opens Shop details, enters their alert email, and verifies the eight-digit code. Codes expire after 15 minutes, allow five attempts, and can be requested at most five times per day with a one-minute interval. Alerts only start after verification. They contain an inquiry reference and the backroom link; customer names, email addresses, messages and pictures stay in the private inbox.

The `market-alert-dispatch` scheduled function runs once per minute on production. A failed delivery does not remove the inquiry. Jobs use atomic leases and provider idempotency keys, with retries limited to 20 hours (within the provider's 24-hour idempotency window). Alerts accepted by the provider are not a guarantee of inbox delivery; inspect provider delivery/bounce logs if mail is missing. There is no delivery-webhook UI in this version. Existing inquiries are not emailed retroactively.

## Rental terms

Renters must explicitly acknowledge the versioned policy before creating a payable review. Once activated, booth rentals are non-refundable; there are no prorated months, partial refunds or credits for unused time. The selected duration is final whether used or not. The backend records the accepted terms version and timestamp and rejects activation or payment reservation without them. Key verification never transfers, spends, burns or locks a key. Granted rental terms are honored after a later key transfer; current ownership is checked at renewal.

## Rental setup and tests

`/market-rent` is a separate wallet-verified enrollment/renewal page. It does not grant merchant editing rights until a reviewed term is activated. Keys are optional. Standard upfront totals are 60,000 BONEZ / one month, 330,000 / six months, and 600,000 / twelve months. BONEZ-ff9a73 has six decimals. Paid transfers go only to the existing Pittensor burn-pile wallet; this is not an on-chain burn itself.

1. Leave Production `MARKET_RENTALS_ENABLED` unset/false during setup. Set it to `true` for Deploy Previews to test wallet sign-in, nonce checks and unsigned mainnet simulation. Preview uses the same database and mainnet: payment buttons can send real BONEZ if approved in the wallet. Test preparation first; a completed payment test requires the payer's deliberate wallet approval.
2. Keep `MARKET_KEY_BENEFITS_ENABLED=false` while the owners finalize benefits. The proposed regular Meta-Key 50% and Diamond no-rent rates can be reviewed but cannot activate or collect at those rates while disabled. A merchant can explicitly choose the standard BONEZ rate instead. Existing private access exceptions stay no-charge.
3. Use a deliberately chosen wallet for the first approved payment. Verify the displayed term, amount, destination, EGLD fee cap, receipt and assigned booth before enabling public Production enrollment. No actual payment was initiated during implementation.
4. Then set `MARKET_RENTALS_ENABLED=true` for Production and redeploy. Enable key benefits separately only after their rules are approved and tested.

The wallet connection uses mainnet and supports the project's guardian checks. Before signing it checks token metadata, liquid balance, fee funds, nonce and unsigned simulation. Before broadcast it rechecks wallet/protection, simulates, and reserves the exact signed hash in the database. There is no automatic rebroadcast. Reloading restores the submitted intent; Check saved payment verifies the canonical mainnet receipt on the backend. Amount, token, recipient, sender, nonce, hash, success, transfer event and review time window must match.

One receipt can activate once. A new wallet receives the next booth number inside an atomic transaction. An existing owner renews their existing shop. Calendar-month terms extend from the later of now or the current expiry, in UTC, with month-end clamping. Moderation suspension always wins. Expired shops retain inventory but their public catalog and editing access close until renewal. No automatic wallet debit occurs.

If submission becomes uncertain, do not pay again. Check the saved Explorer hash and click Check saved payment later. A review reserved before a broadcast failure can remain blocked even if no transaction reached mainnet. An administrator must investigate the hash and wallet nonce before any manual cancellation; this version deliberately has no blind reset/rebroadcast button. Failed/mismatched payments, expired reviews and support/refund cases must be reconciled before another charge. Cancellation never refunds an on-chain transfer.

## Automatic storefronts

`/market-shop?booth=N` renders any active shop's name, description and published products. It has customer inquiries and private reference uploads, using the same owner checks and moderation as Gordon's shop. The market directory reads active shop data and adds cards automatically; unassigned, expired or suspended shops are excluded. Gordon retains his existing custom storefront. Vacant shop prompts lead to `/market-rent`. No separate code page or booth build is needed per merchant.

## Decisions and remaining hands-on checks

- Final key benefit amounts/tiers. Granted time remains valid after a later key transfer, with ownership rechecked at renewal; the key itself always stays in its holder’s wallet.
- Whether staked/delegated keys qualify. Current verification only supports wallet-held keys with actual mainnet balances and on-chain Type attributes in CPMK-8d8a01; display names/art cannot establish a tier.
- Acceptable listings, fulfillment, product-purchase terms and a support contact. The no-refund/no-proration rule above applies to booth rentals.
- Real mailbox verification and delivery; deliberate wallet payment/renewal test; mobile and guarded-wallet hands-on tests. These cannot be established by mocked tests or a successful build.

Validation: Node policy/auth/receipt tests; SQL integration checks in PGlite for private permissions, email code limits, outbox leases, duplicate activations, booth allocation, renewal, suspension and UTC clamping; Netlify app build. To rerun SQL checks, install `@electric-sql/pglite` in a separate temporary development directory and run `MARKET_PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node scripts/test-market-database.mjs` from the repo root. No production dependency is needed.

Sources: https://resend.com/docs/api-reference/emails/send-email ; https://resend.com/docs/dashboard/emails/idempotency-keys ; https://docs.netlify.com/build/functions/scheduled-functions/


### Restricted 1-BONEZ integration test

Preview 28 offers an explicit real-payment test only after authenticating Joe's designated wallet (`shared/market-rental-test.mjs`). It is not a public discount. The server enforces the exact wallet, exact preview origin, one-month standard tier, distinct persisted policy version, and 1,000,000 atomic BONEZ amount. Regular rates and key benefit flags are unchanged; no SQL or environment update is required. Other wallets and production requests cannot create these test quotes. The frontend independently validates the same restriction before signing. Submitted tests use the existing saved-hash and exact mainnet receipt verification, including after reload.

The preview shares the production database. A successful test creates or extends a real shop for one month and sends 1 BONEZ to Pittensor, plus an EGLD network fee. Use Hide store afterward if the booth is only for testing; retain the receipt and rental history. Cancel any unsubmitted existing review before requesting the test price. Never retry a submitted payment; check the saved receipt. This temporary test path should be removed after verification. Diamond no-charge activation remains subject to MARKET_KEY_BENEFITS_ENABLED.
