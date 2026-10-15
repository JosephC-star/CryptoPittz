# Flea Market admin setup

The merchant and inquiry features are live. Admin moderation is staged separately.

1. Run supabase/setup/market-admin-moderation.sql in Supabase. It creates no admin accounts.
2. Obtain Joe's and the owners' public erd1 wallet addresses. Validate checksums and assign only those named wallets through a separate server-side SQL query. Do not infer roles from merchant ownership or Meta-Key holdings.
3. Test wallet signing at /market-admin. Apply a hide and restore, and a suspension and reopening, with reasons. Review the action history.

Public catalog, image access, product inquiries and merchant sessions all enforce moderation state. Inventory, merchant publication state and rental records are preserved. Admin sessions are separate from merchant sessions and expire after one hour. New actions recheck active admin membership. No customer inbox access is granted to the moderation interface.

Rental payment policy: BONEZ and Meta-Keyz only. Rental prices/terms await the owners. No rental charging or automatic renewals are enabled. This restriction is for storefront rent; merchant product price options remain unchanged.

