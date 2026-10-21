# October 21 preview: embedded xPortal and NFT offers

Keep these changes on `feature/oct-21-fixes-preview` (PR #33) until the daily batch is approved.

## Embedded wallet connection

The mobile connect handlers previously always created WalletConnect. That replaces the native webview strategy that sdk-dapp may have restored at startup. A shared connector now chooses the SDK webview provider when an actual React Native postMessage bridge or iOS jsHandler bridge exists, including desktop-view mode. It checks the SDK handshake and awaits wallet authorization; app presence is never login proof. It does not infer a wallet from user-agent text or a generic webkit object.

Outside embedded wallets, mobile keeps the existing WalletConnect modal and desktop keeps the SDK provider picker. Native connection does not display a redundant QR/deep-link modal. Failed handshakes provide reopen/external-browser guidance; cancelled logins do not report success. Applies to home, rentals, merchant backroom, admin, swap, staking, liquidity, and Pittensor. No automatic signing, payment, or blockchain action was sent.

Sources checked: installed sdk-dapp 5.7.2 ProviderFactory/restoreProvider/WebviewProviderStrategy, sdk-webview-provider getPlatform/init/login, and the official repository https://github.com/multiversx/mx-sdk-js-webview-provider . Native handshakes and mobile OS behavior still require hands-on xPortal testing.

## Offers for unlisted Pittz

The external link implementation has been replaced by on-site offer controls. See `docs/onsite-nft-offers.md` for contract evidence, escrow behavior, preview gating, tests and outstanding device acceptance.

## Embedded-wallet acceptance

Open preview inside xPortal on Android/iOS, connect and approve login, check My Pittz loads, reject a second login and confirm clear feedback. Repeat on a merchant/financial page and in desktop-view mode. Check ordinary Chrome/Safari still shows the WalletConnect popup and desktop still shows the provider picker. Device acceptance remains outstanding.
