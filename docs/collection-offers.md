# Collection offers — October 26 preview

Added to `preview/oct-26-galaxy-polish` / PR #37 alongside the galaxy work. Main is unchanged. The explorer has a Collection Offers button beside Show for Sale. My Pittz → Offers received also has collection controls, including a wallet NFT selector. Public browsing works without connecting. Choose Original or Vice; all amounts are EGLD. Existing direct NFT offers remain available.

Each offer buys one NFT from the selected collection, with a 1/3/7-day expiry. Users can create an escrowed offer, withdraw their outstanding offer (including after expiry), or select an owned NFT and review acceptance. The contract settles the first successful acceptance. Expiry does not refund escrow automatically. Fees and royalties reduce the gross sale amount. Listed/contract-held NFTs must return to the owner's wallet first. Trait, SFT, bulk and token-denominated offers are excluded.

## Evidence and checks

Official source: https://github.com/Paix/oox-sdk, `src/abi/oox-marketplace.abi.json`. Added only sendGlobalOffer, withdrawGlobalOffer, acceptGlobalOffer, getFullGlobalOfferData, getAllGlobalOffers, GlobalOffer and OfferType from that ABI. Same licensed contract interface and pinned mainnet contract/code hash as existing direct offers.

Read-only mainnet query decoded 66 global offers on October 26. The stored codec fixture is an existing expired BONEZ offer, used solely to verify decoding and exclusion of unsupported currencies. It is not advertised as an actionable EGLD offer. An unsigned sendGlobalOffer simulation for Original with 0.000001 EGLD succeeded; the saved fixture checks exact collection, amount, buyer and deadline. No funds were sent, no wallet was signed, and no offer was created by these checks. `node scripts/check-collection-offers.mjs` repeats those read-only checks and unsigned simulation and updates fixtures.

Shares existing guardian validation, payload validation, fresh contract/state and balance checks, repeated simulation, saved signed-hash journal, uncertain-broadcast handling and confirmation checks. Acceptance rechecks the exact NFT in the connected wallet and the current global offer before signing and broadcast. Withdrawal checks exact refund events. Global and direct actions share the same pending lock/journal to prevent duplicate actions.

Preview configuration explicitly enables user-approved real mainnet offers for this preview branch; purchase/listing signing remains disabled there. Every real action still requires the user's wallet approval. Production configuration is unchanged.

Remaining hands-on checks before release: small real creation/withdrawal; cooperative owner acceptance; xPortal device flow; desktop/mobile visual review. Creation has a real unsigned simulation fixture; acceptance and withdrawal are payload/event tested and must pass fresh live exact simulations before users can sign. Neither has been claimed as an executed acceptance or withdrawal test.

## Dawg Pound and XOXNO update

Trading controls now live at `/dawg-pound/`, with For Sale and Collection Offers tabs. Homepage Explorer remains full-collection, retractable, and keeps its search, trait filters and pagination; its sale and collection offer buttons are removed. Legacy homepage `sale=listed` links redirect to the Dawg Pound, preserving Original/Vice. Wallet direct offers remain on the homepage with a link to collection offers.

XOXNO collection/trait offers are fetched independently via the public global-offer API and a validated read-only proxy. Cards show exact EGLD price per NFT, quantity and trait restrictions. All XOXNO action links explicitly open the collection on XOXNO; there is no on-site XOXNO collection-offer signing or promise of selected-NFT eligibility. OOX create, accept, and withdraw remain explicitly labeled on-site actions. Empty/error states identify their marketplace. Live proxy checks returned 14 Original and 5 Vice active EGLD offers on October 26; these are API reports, not guarantees of current executable liquidity.
