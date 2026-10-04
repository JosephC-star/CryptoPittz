import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateQuote } from '../src/features/oox/validation.js';
const nft = { collection: 'PITTZ-1a4c2d', identifier: 'PITTZ-1a4c2d-01' };
const listing = { ...nft, nonce: 1, auctionId: 100, quantity: '1', saleType: 'nft', priceType: 'fixed', paymentToken: 'EGLD', paymentTokenNonce: 0, paymentTokenDecimals: 18, price: '1000000000000000000', seller: 'seller', isActive: true, startTime: 0, deadline: 9999999999 };
const quote = { listing, auctionId: 100, quantity: '1', purchasable: true, paymentToken: 'EGLD', paymentTokenNonce: 0, paymentTokenDecimals: 18, totalPrice: listing.price };
test('accept matching quote', () => assert.doesNotThrow(() => validateQuote(quote, listing, nft, 'buyer')));
for (const [name, changed] of Object.entries({ price: { totalPrice: '2000000000000000000' }, currency: { paymentToken: 'OTHER' }, auction: { auctionId: 101 }, unavailable: { purchasable: false }, quantity: { quantity: '2' }, wrongNft: { listing: { ...listing, nonce: 2 } }, expired: { listing: { ...listing, deadline: 1 } }, seller: { listing: { ...listing, seller: 'other' } } })) {
 test(`reject ${name}`, () => assert.throws(() => validateQuote({ ...quote, ...changed }, listing, nft, 'buyer')));
}
test('reject self purchase', () => assert.throws(() => validateQuote(quote, listing, nft, 'seller')));
