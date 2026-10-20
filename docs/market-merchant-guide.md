# Shop discovery and merchant setup

The public market directory includes every active, non-suspended shop. It supports text search across shop names and descriptions, category filters, and pages of twelve shops. Each card shows a cover (or a branded fallback), a short description, a published-item count, and up to three recent published items. Draft, archived and admin-hidden inventory is excluded. Missing product photos use the merchant's saved default image.

Categories are assigned from public shop names and descriptions. A shop can appear in multiple categories: Home & rugs, Clothing & accessories, Art & collectibles, Digital goods, Custom & handmade, or Other finds. Merchants can update their shop description to describe their goods clearly; no database migration is needed.

The authenticated merchant backroom shows the latest activated rental tier, recorded expiry, remaining days and a link to review/renew. This represents the benefit granted for the current term; it does not claim current ownership of a key. Rental eligibility is checked again by the existing rental flow at renewal. Private rental records and alert contact addresses are never sent to the public directory.

The collapsible merchant guide tracks four real setup steps: shop name/description, saved cover photo, first visible published item, and verified/enabled inquiry email alerts. Action buttons open the relevant settings or product editor. Merchants may reopen completed steps, and setup does not block shop access.

Validation: merchant/rental/email API tests, directory privacy and pagination tests, overview ownership tests, and category/rental/setup state tests. Preview builds validate the complete app with the existing marketplace dependencies.

## Clean-build dependency repair

The old `@oox-marketplace/sdk@0.1.0` npm tarball returns 404. This preview uses the publisher's renamed `@oox-marketplace/sdk-core@0.1.1`, pinned in the lockfile. Upstream repository: https://github.com/Paix/oox-sdk ; rename commit: 26164ed221180a1c3be14eab7e8c15bedb654697. That commit changes package/documentation metadata without changing SDK source files. Local regression tests verify the actual published SDK's exact amount conversion and buy/list/cancel transaction payloads against this site's existing review checks. No signed transactions were broadcast during validation.

Validation after dependency repair: clean `npm ci`, full `npm run build`, and all 224 repository tests pass. This branch remains preview-only pending visual review and live release approval.
