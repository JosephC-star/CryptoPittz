import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateListing, validateQuote } from '../src/features/oox/validation.js';
const nft = { collection: 'PITTZ-1a4c2d', identifier: 'PITTZ-1a4c2d-01' };
const listing = { ...nft, nonce: 1, auctionId: 100, quantity: '1', saleType: 'nft', priceType: 'fixed', paymentToken: 'EGLD', paymentTokenNonce: 0, paymentTokenDecimals: 18, price: '1000000000000000000', seller: 'seller', isActive: true, startTime: 0, deadline: 9999999999 };
const quote = { listing, auctionId: 100, quantity: '1', purchasable: true, paymentToken: 'EGLD', paymentTokenNonce: 0, paymentTokenDecimals: 18, totalPrice: listing.price };
test('accept matching quote', () => assert.doesNotThrow(() => validateQuote(quote, listing, nft, 'buyer')));
for (const [name, changed] of Object.entries({ price: { totalPrice: '2000000000000000000' }, currency: { paymentToken: 'OTHER' }, auction: { auctionId: 101 }, unavailable: { purchasable: false }, quantity: { quantity: '2' }, wrongNft: { listing: { ...listing, nonce: 2 } }, expired: { listing: { ...listing, deadline: 1 } }, seller: { listing: { ...listing, seller: 'other' } } })) {
 test(`reject ${name}`, () => assert.throws(() => validateQuote({ ...quote, ...changed }, listing, nft, 'buyer')));
}
test('reject self purchase', () => assert.throws(() => validateQuote(quote, listing, nft, 'seller')));

for (const [nonce, suffix] of [[644, '0284'], [256, '0100'], [4095, '0fff'], [4096, '1000']]) {
  const paddedNft = { ...nft, identifier: `${nft.collection}-${suffix}` };
  const paddedListing = { ...listing, ...paddedNft, nonce };
  test(`accept byte-padded nonce ${suffix}`, () => assert.doesNotThrow(() => validateListing(paddedListing, paddedNft, 'buyer')));
  test(`reject different nonce for ${suffix}`, () => assert.throws(() => validateListing({ ...paddedListing, nonce: nonce + 1 }, paddedNft, 'buyer')));
}
test('reject wrong collection', () => assert.throws(() => validateListing({ ...listing, collection: 'PITTZVICE-c3ec94' }, nft, 'buyer')));
test('reject different identifier', () => assert.throws(() => validateListing({ ...listing, identifier: 'PITTZ-1a4c2d-02' }, nft, 'buyer')));
