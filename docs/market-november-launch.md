# Flea market preparation for the site-wide launch

Preview only: PR #32. Do not merge or publish production until approved.

## Completed cleanup

- Removed optional rental reminder sender, settings, SQL setup and related tests. Inquiry email alerts remain. Rental expiry, projected renewal coverage and same-booth renewal remain visible on the merchant/rental pages.
- Removed stale claims that rentals/key checks are not connected and that a key is required. All enrollment calls to action lead directly to /market-rent; the key showcase remains informational.
- Removed the unreachable booth-sign prototype form, its input handlers, unused demo display script and dummy product-description function.
- Gordon's photos are labeled portfolio examples, separate from published inventory, without invented prices, availability or merchant policies. Payment, shipping, returns and cancellation terms must be agreed with the merchant.
- Added shopping/rental help, an accessible Gordon anchor and official CryptoPittz contact mailto links in the main footer, market footer and merchant/storefront/rental pages. Clemons Web Co. technical support and credit remain separate.
- November 1, 2026 is an internal target for the entire PittzStop site. No public date announcement, countdown or automatic release is configured. See site-launch-checklist.md for the site-wide checklist.

## Verification

Run `python scripts/audit-market-links.py` to check authored market links/assets, inline button targets and literal React links against configured local routes. This does not exercise authenticated controls or JavaScript-generated URLs. Run `node --test tests/*.test.mjs` and `npm run build` as normal.

## Before production approval

- Owner confirms product availability, merchant payment methods, delivery and return/cancellation terms. Portfolio examples must not be treated as stock.
- Visually review mobile/desktop menus, shop filtering, banner fitting, gallery close/swipe/arrow controls and inquiry forms.
- Verify a real inquiry arrives in the merchant inbox and notification mailbox, and test saved rental receipt recovery without an additional charge. Existing live rental/payment tests do not establish all new UI paths.
- Check external destinations in a real browser. HTTP responses establish reachability, not correct third-party content or valid Discord invitation membership.
- Confirm official contact address Cryptopittz69@gmail.com is monitored. It is an email address; no new company website URL was provided.
- After production approval, deploy and repeat the storefront/inquiry/renewal checks on the live domain. Scheduled email renewal reminders are not included and require no setup.
