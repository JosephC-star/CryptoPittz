# Pack verdict shop reviews

Preview branch: `feature/oct-21-fixes-preview`, PR #33. Do not merge until the batch is approved.

## One database setup step

Run `supabase/setup/market-reviews.sql` in the existing Supabase project's SQL editor. This is additive and rerunnable. It creates reviews and moderation audit records, indexes, and service-only functions. It does not alter existing inventory, rentals, inquiries, or notifications. No new Netlify variables are needed.

The preview and production currently share merchant storage: reviews submitted during preview are real database records, though they start pending. Use clearly marked test text and keep it hidden. Main has no review UI until this batch is merged. The live Supabase migration has not been applied by Codex.

Before setup, the storefront shows an unavailable message and lets you inspect the rating picker; submission stays disabled. After setup, refresh reviews to enable submission. There are no seeded reviews, invented averages, or verified-purchase badges.

## Behavior

- Each active, unsuspended shop has a Pack verdict section on `/market-shop?booth=N#shop-reviews`. Gordon's featured dialog links there too.
- Scale: 1 Needs work; 2 Room to improve; 3 Solid shop; 4 Pack approved; 5 This shop is the sh*t. Numeric labels accompany poop icons; radios support keyboard selection.
- Public name (2–60 characters), rating (whole number 1–5), review (10–1,500 characters), and publication consent are required. Do not submit private details.
- Community reviews are not proof of purchase or authenticated identities. Purchases occur directly with merchants. Names can be chosen by submitters.
- All reviews start pending. Only published reviews appear and count in the average. An empty shop has no rating. Public reads are paginated, newest first.
- Admin → Shop reviews: publish/hide, with a required reason. Apply the same standards to positive and negative feedback. Shop owners cannot moderate their own reviews. Review history records the acting admin, reason, status change, and time.
- Anonymous database access is denied. Only the server uses the service key; public JSON excludes client hashes. Reviews render as text, not HTML.
- Spam controls: trusted Netlify client-IP hash, honeypot, request-size validation, atomic per-client limits (one review/shop/day, three total/day), and idempotent request IDs. Shared networks share a limit; these controls do not prove unique humans. Admin moderation remains necessary.

## Validation and acceptance

- 254 Node tests pass, including six review API/input/authentication tests.
- Production build passes (existing large-chunk warning).
- Local PostgreSQL-compatible PGlite drill passed: rerunnable setup, repeated request IDs, daily limit, pending exclusion, mixed-rating averages, hide/recalculate, moderation audit, unauthorized admin denial, and anonymous table/function denial.
- Live Supabase application and device visual review remain outstanding. API tests use mocked storage; the SQL drill uses isolated local tables.

Optional SQL drill: install `@electric-sql/pglite` in a temporary directory, then set `PITTZ_PGLITE_MODULE` to its file module URL and run `node scripts/test-market-reviews-sql.mjs`. The drill creates only in-memory test tables and closes the instance after validation.

Acceptance: load Gordon's review link on mobile/desktop, choose all five rating levels, submit clearly marked test feedback, check it is pending and absent publicly, publish from admin, confirm average/count, then hide with a reason and confirm removal from score and visibility. Review history should contain both actions. Keep test feedback hidden before production release.
