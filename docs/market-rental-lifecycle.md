# Rental reminders and renewals

This update stays on PR #32 until approved. It adds optional rental reminder emails and a clearer existing-shop renewal summary. Rental pricing, payment destinations and accepted terms are unchanged. There are no automatic wallet charges.

## Activate the reminder connection

1. In Supabase SQL Editor, run `supabase/setup/market-rental-reminders.sql` after the existing market rental/alert setup. The result should show `rental_reminders_ready = true`. It adds one private queue and an optional reminder preference, default false. Existing assignments, inventory, expiry dates and inquiry notifications are preserved. This is safe to rerun.
2. In Netlify, add `MARKET_RENTAL_REMINDERS_ENABLED=true`, Functions scope. Set Deploy Previews to test the opt-in controls after SQL setup. Enable Production when this preview is approved for launch, then redeploy. Existing Resend settings are reused. There is no new API key.
3. Merchants verify and enable their shop alert email, then explicitly choose **Enable rental reminders** in Shop details or on the wallet-verified rental page. Existing merchants are not silently opted in.

The scheduled function runs every 15 minutes on the published production deploy only. Previews do not claim jobs or send scheduled reminder emails, even if the variable is true. Do not invoke the dispatcher manually against the production database for a preview test.

## Behavior

- Notices at the current stage: within seven days, within one day, then after expiration (up to seven days late). Each stage sends at most once per shop expiry. Starting the service late sends the current notice, not a burst of missed notices. Timing depends on scheduled runs and provider availability.
- Complimentary test access and suspended shops are excluded. Diamond terms with an actual expiration can receive reminders because their granted term still requires renewal.
- Reminders require the same verified enabled shop email plus the separate reminder opt-in. Turning off shop emails stops reminders too. The rental page permits opt-out even after expiration has closed backroom access.
- The queue is private, atomically leased and deduplicated. Retries stay within 20 hours and use a stable Resend idempotency key. Current owner, verified recipient, preference, expiry and stage are checked again immediately before sending; renewed terms cancel stale pending reminders. A renewal completed while an email is already being sent may cross with that notice.
- Expiration already removes a shop from public discovery and blocks catalog/editing access. Its booth and inventory remain intact. The wallet-verified rental page stays available to renew it.
- Early renewal extends the current expiry; expired renewal starts from activation time. UTC calendar months clamp at month-end. The displayed new end is an estimate until activation. Current key eligibility is checked again. Submitted payments remain recoverable through **Check saved payment**; do not submit twice.

## Validation

`node --test tests/*.test.mjs` and `npm run build`.

For real SQL behavior, install `@electric-sql/pglite` in a temporary folder outside the app, then run both scripts with `MARKET_PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js`:

- `node scripts/test-market-database.mjs`: activation, early/expired renewal, preserved inventory, same booth, duplicate receipts, suspension and month-end clamping.
- `node scripts/test-rental-reminders.mjs`: reminder stages, consent/exclusions, duplicate claims, stale-job cancellation, lease retry, retry age, private permissions and safe schema reruns.

Before launch: visually test mobile and desktop renewal/opt-in controls in the preview after SQL setup. After approved production launch, use a deliberately selected test merchant's verified mailbox to confirm scheduled delivery and opt-out. No live payment or email was sent during implementation.
