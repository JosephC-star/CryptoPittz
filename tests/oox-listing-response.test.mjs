import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readListingItems } from '../src/features/oox/listingResponse.js';
test('handles observed empty API response with omitted items', () => assert.deepEqual(readListingItems({ total: 0, from: 0, size: 20 }), []));
test('keeps available listings', () => assert.deepEqual(readListingItems({ items: [{ auctionId: 1 }], total: 1 }), [{ auctionId: 1 }]));
test('rejects missing items when listings are reported', () => assert.throws(() => readListingItems({ total: 1 })));
test('rejects malformed response', () => assert.throws(() => readListingItems(null)));
