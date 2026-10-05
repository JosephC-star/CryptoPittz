# PittzStop marketplace and Playground release

Production enables the tested OOX mainnet buy/list flow, My Listings, reviewed transaction safeguards, gold price styling and ownership-confirmed purchase celebration. XOXNO transactions remain pending vendor verification. Cancelling a wallet signature does not cancel an existing marketplace listing; listing management links lead to OOX.

The homepage arcade is a compact entrance linking to `/playground/`. This separately loaded page preserves the nine-game Playground, Vibe Mode, trophies, recent mobile adjustments and a Work in progress banner. Report a Gremlin uses the existing support email, subject and copy-address fallback.

The Playground is based on Pittz-Playground-Preview.html version 29 (2026-10-03). Its bundled JS/CSS are preserved here as a release artifact, with repeated embedded images extracted to local assets. The original source remains the basis for future game edits. It does not sign marketplace transactions. A public wallet address passed from the homepage loads owned Pittz for game decks; failed lookups fall back to random Pittz. Game Bonez have no cash/token value.

Validation: 58 marketplace/dependency tests passed; targeted ESLint passed; production build and Playground JS syntax check passed. Browser execution must be smoke-checked on the deployed site; local browser installation was unavailable. Follow-up: actual device checks of homepage, marketplace signing cancellation/return, Playground navigation, controls and feedback links. Known dependency findings remain in OOX-SECURITY-REVIEW.md.
