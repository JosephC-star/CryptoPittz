import test from 'node:test';
import assert from 'node:assert/strict';
import {COUNTS, schedule} from '../public/staking-preview/model.js';
import {practicePayout} from '../scripts/practice-staking-payout.mjs';

const cutoff = '2026-11-18T06:00:00Z';
const snapshot = Date.parse(cutoff);
const anchor = {wallet: 'practice-wallet', listed: false, escrow: false};
const escrow = {...anchor, listed: true, escrow: true};

function evidence() {
  const ranks = {original: [1, 2, 3, 4, 452, 1246, 3196], vice: [1, 2, 3, 4, 105, 299, 702]};
  const nfts = Object.entries(COUNTS).flatMap(([collection, counts]) => {
    let nonce = 0;
    return counts.flatMap((count, tier) => Array.from({length: count}, () => ({
      collection, nonce: ++nonce, rank: ranks[collection][tier], evidence: 'verified', anchor, events: [],
    })));
  });
  return {cutoff, week: 1, nfts};
}

test('full synthetic run resets the hold on escrow return and preserves the snapshot owner', () => {
  const input = evidence();
  const [returned, moved, listed] = input.nfts;
  returned.anchor = escrow;
  returned.events = [{timestamp: snapshot - 36 * 3600000, before: escrow, after: anchor}];
  moved.events = [{timestamp: snapshot + 1, before: anchor, after: {...anchor, wallet: 'later-wallet'}}];
  listed.anchor = escrow;
  input.nfts.at(-1).anchor = {...anchor, wallet: "second-wallet"};
  const report = practicePayout(input);
  assert.equal(report.status, 'calculated');
  assert.equal(report.rows.length, 6705);
  assert.deepEqual(report.rows.slice(0, 3).map(row => row.status), ['Held under 48 hours', 'Eligible', 'Listed']);
  assert.equal(report.rows[1].wallet, anchor.wallet);
  assert.equal(report.wallets.length, 2);
  assert.equal(report.wallets.reduce((sum, row) => sum + BigInt(row.amountAtomic), 0n), schedule().weeks[0].budget);
  assert.equal(report.unallocatedAtomic, '0');
});

test('missing rows or a broken custody chain block wallet totals', () => {
  const input = evidence();
  input.nfts.pop();
  assert.equal(practicePayout(input).status, 'blocked');
  const full = evidence();
  full.nfts[0].events = [{timestamp: snapshot - 1, before: escrow, after: anchor}];
  const report = practicePayout(full);
  assert.equal(report.status, 'blocked');
  assert.deepEqual(report.unresolved, ['original:1']);
  assert.equal(report.wallets, undefined);
});
