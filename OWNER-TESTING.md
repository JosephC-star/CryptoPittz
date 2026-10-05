# PittzStop OOX owner testing

Open https://deploy-preview-5--cryptopittz.netlify.app/ after its updated deployment finishes. Real transaction controls are enabled only for previews built from `feature/oox-purchase-preview`. Other PR previews remain simulation-only. This avoids enabling real purchases in unrelated previews. Netlify team protection must remain enabled. An owner without access needs to be invited through Netlify; never share your login.

Use a separate wallet with a small amount of mainnet EGLD and only one or two NFTs intended for testing. Do not provide recovery phrases or private keys to the site or developer. Listing transfers the selected NFT into OOX's contract and spends network fees. Buying spends the exact listed EGLD plus network fees. Unsold NFT retrieval should be verified on OOX before listing; listing management/cancellation from PittzStop is not yet implemented.

1. Open the protected branch preview and connect your test wallet. The branch uses mainnet. Disconnect old devnet sessions first.
2. For a purchase, open Explorer and select a fixed-price EGLD Pitt with a supported OOX API listing. Click Review buy. Read the NFT identifier, price, contract and fee allowance. Click Sign & send purchase only when you intend a real purchase. Review the wallet prompt before approving.
3. For a listing, open My Pittz and select a test NFT you own. Set a small positive fixed EGLD price and a duration. Click Review listing. Confirm the exact NFT and price, then approve Sign & send listing in your wallet.
4. After submission, check wallet history or the MultiversX explorer for settlement. Confirm the bought NFT arrives or the listing appears on OOX. A submitted transaction is not proof of settlement.
5. If the wallet rejects signing, or the site reports an error, check wallet history before retrying. Never approve a duplicate request until the earlier one is resolved.
6. Send the developer the NFT identifier, steps, exact error text, public transaction hash if available, and a screenshot without secrets.

Missing listing, changed price, wrong wallet/network, ownership mismatch or unexpected transaction fields must block signing/sending. Don't work around them. The new OOX API can disagree with existing sale badges; missing listings remain unavailable.

Not yet verified end to end: actual wallet signing/broadcast, settlement, mobile wallet sessions, cancelling listings via OOX, guarded-wallet compatibility. Dependency audit advisories remain under review. This owner preview is not a completed audit or public launch.
