# OOX simulation preview

This draft adds fixed-price EGLD listings to NFT details when VITE_OOX_PREVIEW=true. The panel accepts a public mainnet address, builds an unsigned purchase with a fresh quote, verifies its fields, and calls only /transaction/simulate?checkSignature=false with a dummy signature. No signing provider or broadcast endpoint is used.

Run locally: `VITE_OOX_PREVIEW=true npm run dev -- --host 0.0.0.0`.

Open Explorer, select a listed Original or Vice Pitt, and enter a public mainnet buyer address. The address must have enough balance for the purchase and conservative fee cap. No balance is spent. Inspect the full simulation response: routing-only responses do not establish contract execution success.

Netlify deployment previews enable the panel via netlify.toml. A preview URL is not private by itself: enable hosting access protection before sharing confidential content. Do not merge this draft into production; preview context settings apply to other PRs as well and should be removed when testing ends.

The existing devnet wallet configuration is deliberately unchanged. This phase does not use a connected wallet or request signatures. Mainnet wallet integration is separate subsequent work.

Validation: `node --test tests/oox-validation.test.mjs`; `npx eslint src/features/oox src/components/nft/NftDetailModal.jsx`; `VITE_OOX_PREVIEW=true npm run build`.

Not yet validated: browser runtime, mobile layout, OOX browser CORS, live funded-address simulation, end-to-end purchase settlement. This is an integration draft, not a security audit. Dependency audit findings need triage before public purchasing is enabled.
