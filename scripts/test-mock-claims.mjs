import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {accounting, claim, emptyLedger, validateSnapshot} from '../public/staking-preview/claim-model.js';
const snapshot = validateSnapshot(JSON.parse(await readFile(
  new URL('../public/staking-preview/claim-fixture.json', import.meta.url), 'utf8')));
const wallet = snapshot.wallets.find(row => row.eligible).wallet;
const empty = snapshot.wallets.find(row => !row.eligible).wallet;

test('verified fixture contains 823 eligible wallets and 6,480 eligible Pittz', () => {
  assert.equal(snapshot.wallets.filter(row => row.eligible).length, 823);
  assert.equal(snapshot.wallets.reduce((n, row) => n + row.eligible, 0), 6480);
  assert.equal(snapshot.budgetAtomic, '423414683044');
});

test('exact opening is inclusive and deadline is exclusive', () => {
  assert.throws(() => claim(snapshot, emptyLedger(snapshot), wallet, snapshot.open - 1), /not opened/);
  assert.ok(claim(snapshot, emptyLedger(snapshot), wallet, snapshot.open).receipts[wallet]);
  assert.ok(claim(snapshot, emptyLedger(snapshot), wallet, snapshot.deadline - 1).receipts[wallet]);
  assert.throws(() => claim(snapshot, emptyLedger(snapshot), wallet, snapshot.deadline), /closed/);
});

test('ineligible and unknown wallets receive no allocation', () => {
  for (const address of [empty, 'unknown']) {
    assert.throws(() => claim(snapshot, emptyLedger(snapshot), address, snapshot.open), /no eligible/);
  }
});

test('claim is immutable and survives serialization, with duplicate attempts rejected', () => {
  const previous = emptyLedger(snapshot);
  const saved = claim(snapshot, previous, wallet, snapshot.open);
  assert.deepEqual(previous.receipts, {});
  const restored = JSON.parse(JSON.stringify(saved));
  assert.throws(() => claim(snapshot, restored, wallet, snapshot.open), /already claimed/);
  assert.equal(restored.receipts[wallet].amountAtomic, snapshot.wallets.find(row => row.wallet === wallet).amountAtomic);
});

test('claimed plus remaining plus expired plus unallocated always equals pool', () => {
  const saved = claim(snapshot, emptyLedger(snapshot), wallet, snapshot.open);
  for (const now of [snapshot.open, snapshot.deadline - 1, snapshot.deadline]) {
    const result = accounting(snapshot, saved, now);
    assert.equal(Object.values(result).reduce((a, b) => a + b, 0n), BigInt(snapshot.budgetAtomic));
    assert.equal(result.expired > 0n, now >= snapshot.deadline);
  }
});

test('all 823 claims conserve the exact pool and expiration after full claiming is zero', () => {
  let ledger = emptyLedger(snapshot);
  for (const row of snapshot.wallets.filter(row => row.eligible)) {
    ledger = claim(snapshot, ledger, row.wallet, snapshot.open);
  }
  const totals = accounting(snapshot, ledger, snapshot.deadline);
  assert.equal(totals.claimed, BigInt(snapshot.budgetAtomic));
  assert.equal(totals.expired, 0n);
});

test('rejects altered receipts, mismatched snapshots and conflicting allocations', () => {
  const saved = claim(snapshot, emptyLedger(snapshot), wallet, snapshot.open);
  saved.receipts[wallet].amountAtomic = '1';
  assert.throws(() => accounting(snapshot, saved, snapshot.open), /conflicts/);
  assert.throws(() => accounting(snapshot, {...saved, snapshotId: 'other'}, snapshot.open), /Invalid/);
  assert.throws(() => validateSnapshot({...snapshot, budgetAtomic: '1'}), /reconcile/);
});
