import assert from 'node:assert/strict';
import test from 'node:test';
import {delistSpec, matchesWithdrawal} from '../src/features/oox/delistSpec.mjs';

const listing = {identifier: 'PITTZ-1a4c2d-02f6', seller: 'seller', auctionId: 1434880};
const wallet = Buffer.alloc(32, 42).toString('base64');

test('delisting uses a zero-value single-auction call for each venue', () => {
  assert.equal(delistSpec('OOX', listing, 'seller').data, 'withdraw@15e500');
  const xoxno = delistSpec('XOXNO', listing, 'seller');
  assert.equal(xoxno.data, 'withdraw@@15e500');
  assert.equal(xoxno.value, '0');
  assert.throws(() => delistSpec('OOX', listing, 'another-wallet'));
  assert.throws(() => delistSpec('OOX', {...listing, identifier: 'OTHER-abcdef-01'}, 'seller'));
  assert.throws(() => delistSpec('unknown', listing, 'seller'));
});

test('simulation must identify the same marketplace, NFT, auction and recipient', () => {
  const spec = delistSpec('XOXNO', listing, 'seller');
  const event = {address: spec.receiver, identifier: 'withdraw', topics: [
    btoa('withdraw_event'), btoa('PITTZ-1a4c2d'), 'AvY=', 'FeUA', 'AQ==', wallet,
  ]};
  assert(matchesWithdrawal([event], spec, listing, wallet));
  assert(!matchesWithdrawal([event], spec, {...listing, auctionId: listing.auctionId + 1}, wallet));
  assert(!matchesWithdrawal([event], spec, {...listing, identifier: 'PITTZ-1a4c2d-02f7'}, wallet));
  assert(!matchesWithdrawal([event], spec, listing, btoa('different recipient')));
  assert(!matchesWithdrawal([event, {identifier: 'signalError'}], spec, listing, wallet));
  assert(!matchesWithdrawal([], spec, listing, wallet));
});
