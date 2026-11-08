// Run with the verified, normalized Nov 6–8 rehearsal evidence.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {practicePayout} from './practice-staking-payout.mjs';

const evidencePath = process.argv[2];
assert.ok(evidencePath, 'Usage: node scripts/test-staking-rehearsal.mjs EVIDENCE.json');
const evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
assert.equal(evidence.cutoff, '2026-11-08T17:23:11Z');
assert.equal(evidence.week, 1);

test('replays the fixed cutoff and excludes all contract custody', () => {
  const input = structuredClone(evidence);
  // Prove the non-marketplace exclusions do not depend on pre-tagged escrow.
  const otherCustody = input.nfts.filter(nft => nft.anchor.escrow && !nft.anchor.listed);
  assert.equal(otherCustody.length, 61);
  for (const nft of otherCustody) nft.anchor.escrow = false;

  const report = practicePayout(input);
  assert.equal(report.status, 'calculated');
  assert.deepEqual(report.unresolved, []);
  assert.equal(report.rows.filter(row => row.status === 'Eligible').length, 6478);
  assert.equal(report.rows.filter(row => row.status === 'Listed').length, 164);
  assert.equal(report.rows.filter(row => row.status === 'Contract custody').length, 61);
  const reset = report.rows.filter(row => row.status === 'Held under 48 hours');
  assert.deepEqual(reset.map(row => row.id).sort(), ['original:6731', 'vice:755']);
  assert.ok(reset.every(row => row.amountAtomic === '0'));
  assert.equal(report.wallets.length, 823);
  assert.equal(report.budgetAtomic, '423414683044');
  assert.equal(report.unallocatedAtomic, '0');
  assert.equal(report.wallets.reduce((sum, row) => sum + BigInt(row.amountAtomic), 0n),
    BigInt(report.budgetAtomic));
});

test('withholds wallet totals when a custody movement conflicts with the anchor', () => {
  const input = structuredClone(evidence);
  const nft = input.nfts.find(nft => nft.collection === 'original' && nft.nonce === 6731);
  nft.events[0].before.wallet = nft.events[0].after.wallet;
  const report = practicePayout(input);
  assert.equal(report.status, 'blocked');
  assert.deepEqual(report.unresolved, ['original:6731']);
  assert.equal(report.wallets, undefined);
});

test('withholds wallet totals when collection coverage is incomplete', () => {
  const report = practicePayout({...evidence, nfts: evidence.nfts.slice(1)});
  assert.equal(report.status, 'blocked');
  assert.equal(report.wallets, undefined);
});
