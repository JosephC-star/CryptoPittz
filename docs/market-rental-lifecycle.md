# Storefront renewals

Email renewal reminders were removed at the owner’s request. No reminder SQL setup or Netlify reminder variable is required. Existing customer inquiry emails remain available. Any previously added MARKET_RENTAL_REMINDERS_ENABLED variable can be removed; this branch no longer contains a reminder sender. If the earlier reminder SQL was already applied, its unused private table/column can remain; no destructive cleanup is required.

The merchant area displays the current expiry and links to the rental page. The rental page shows existing coverage and an estimated new expiry. Early renewals extend from the current expiry; expired renewals start from activation time. UTC calendar months clamp at month-end. Granted key benefits last through their term, with eligibility checked again at renewal.

An expired shop’s public listing and editing access pause, while its inventory and booth remain saved. The assigned wallet can still verify on the rental page and renew the same shop. No automatic wallet charge occurs. A saved submitted payment must be checked before attempting another payment.

Validation: node --test tests/*.test.mjs; npm run build. Optional real SQL integration: MARKET_PGLITE_MODULE=/path/to/pglite/dist/index.js node scripts/test-market-database.mjs. Test a deliberate live renewal only with the wallet owner’s approval.
