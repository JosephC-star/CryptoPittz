# October 21 preview: embedded xPortal and NFT offers

Keep these changes on `feature/oct-21-fixes-preview` (PR #33) until the daily batch is approved.

## Embedded wallet connection

The mobile connect handlers previously always created WalletConnect. That replaces the native webview strategy that sdk-dapp may have restored at startup. A shared connector now chooses the SDK webview provider when an actual React Native postMessage bridge or iOS jsHandler bridge exists, including desktop-view mode. It checks the SDK handshake and awaits wallet authorization; app presence is never login proof. It does not infer a wallet from user-agent text or a generic webkit object.

Outside embedded wallets, mobile keeps the existing WalletConnect modal and desktop keeps the SDK provider picker. Native connection does not display a redundant QR/deep-link modal. Failed handshakes provide reopen/external-browser guidance; cancelled logins do not report success. Applies to home, rentals, merchant backroom, admin, swap, staking, liquidity, and Pittensor. No automatic signing, payment, or blockchain action was sent.

Sources checked: installed sdk-dapp 5.7.2 ProviderFactory/restoreProvider/WebviewProviderStrategy, sdk-webview-provider getPlatform/init/login, and the official repository https://github.com/multiversx/mx-sdk-js-webview-provider . Native handshakes and mobile OS behavior still require hands-on xPortal testing.

## Offers for unlisted Pittz

The installed OOX SDK-core 0.1.1 has buy/list/auction-bid methods, not an unlisted-NFT offer builder. The modal therefore offers an explicitly external **Make an offer on OOX** link for supported Pittz collections when the connected user is not known to own it and no listing/purchase is known. It opens the exact NFT page, not a collection search. Known listings retain existing purchase controls. Link text explains continuation on OOX, and that an offer does not guarantee a sale. No offer amount is collected, no owner notification is promised, and no local signature/payment is requested.

HTTP check: https://www.oox.art/marketplace/nfts/PITTZ-1a4c2d-01 returned 200 with title CryptoPittz #1 | OOX Marketplace. OOX offer availability, supported currencies, escrow/cancellation and terms must be reviewed there; no external offer was submitted or guaranteed available for every asset.

## Checks and device acceptance

262 Node tests pass, including bridge routing, iOS generic-webkit exclusion, desktop-view native routing, handshake failure, cancellation, exact NFT links, owned/listed suppression and malformed-identifier rejection. Build and local link audit pass. Existing bundle-size warning remains.

Hands-on: open preview inside xPortal on Android/iOS, connect and approve login, check My Pittz loads, reject a second login and confirm clear feedback. Repeat on a merchant/financial page and in desktop-view mode. Check ordinary Chrome/Safari still shows the WalletConnect popup and desktop still shows the provider picker. Inspect an unlisted Original/Vice Pittz, follow the exact OOX asset link and review offer controls there without submitting until ready. Device acceptance remains outstanding.
