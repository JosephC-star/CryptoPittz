# XOXNO purchases

The NFT modal supports fixed-price EGLD purchases for PITTZ-1a4c2d and PITTZVICE-c3ec94 on XOXNO. OOX purchase/listing controls remain available. XOXNO listing/cancellation, auctions, SFTs and ESDT payment listings are outside this change.

The official SDK is an API wrapper; the integration uses its published REST endpoint `/nft/:identifier` through a bounded, read-only same-origin Netlify function. No extra SDK runtime is required. This endpoint supplies current listing metadata, not an unsigned purchase transaction. Transactions are constructed locally from the verified contract format.

Sources reviewed October 8, 2026:
- https://github.com/XOXNO/sdk-js/blob/alpha/src/utils/const.ts (mainnet XOXNO contract)
- https://github.com/XOXNO/rs-marketplace/blob/main/src/init.rs (`buy` endpoint)
- https://github.com/XOXNO/rs-marketplace/blob/main/src/auction.rs (Auction layout)
- https://github.com/XOXNO/rs-marketplace/blob/main/src/storage.rs (`getFullAuctionData` view)
- Successful CryptoPittz buy: https://explorer.multiversx.com/transactions/c145f6059e9c935450d1e575e443ba539733e5466240f7e0854cca45c8de3e5b

The pinned contract is `erd1qqqqqqqqqqqqqpgq6wegs2xkypfpync8mn2sa5cmpqjlvrhwz5nqgepyg8`. Purchase payload: `buy@auctionIdHex@collectionHex@nftNonceHex@01`. Native EGLD value equals the exact atomic fixed price. Gas limit is 45 million; maximum fee allowance is 0.045 EGLD.

Before review, before signing and after signing, fresh API metadata is checked against decoded on-chain auction data. Checks bind collection, nonce, one-NFT quantity, fixed-price type, payment token/nonce, price, seller and timing. Unknown auction layouts are rejected. Wallet balance, mainnet, nonce, unchanged signed transaction fields and unsigned simulation are required. Guarded wallets are currently excluded. Broadcasting occurs only once; an uncertain submission blocks another purchase in that modal.

The reveal waits for an exact successful transaction and NFT ownership in the purchasing wallet. Simulation and read-only requests do not buy an NFT. A real end-to-end purchase still requires the owner's wallet approval.

Validation: the live 2 EGLD PITTZ-1a4c2d-0eb5 listing matched its on-chain auction, and an unsigned 45-million-gas simulation succeeded with the expected NFT transfer, seller payment and royalty distribution. Contract source reviewed at commit `8be1eeb29d2fca0d413ef15c08e94ed87c336d49`. No signed or real purchase was sent during verification.
