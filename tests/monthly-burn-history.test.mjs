import test from 'node:test';
import assert from 'node:assert/strict';
import { monthlyBurnHistory, formatBurnAmount } from '../src/features/bonez-burn/monthly-burns.mjs';
const receipt = (month, atomic, digit) => ({ burnedAt: `2026-${month}-01T06:00:00Z`, atomic, hash: digit.repeat(64) });
test('starts in November without inventing burns and opens subsequent months', () => {
  const rows = monthlyBurnHistory({ startMonth: '2026-11', receipts: [] }, new Date('2026-12-10Z'));
  assert.deepEqual(rows.map(r => r.month), ['2026-12', '2026-11']);
  assert.equal(rows[0].cumulativeAtomic, 0n);
  assert.equal(rows[0].receipts.length, 0);
});
test('sums multiple burn receipts exactly and carries totals chronologically', () => {
  const rows = monthlyBurnHistory({ startMonth: '2026-11', receipts: [receipt('12', '2000000', 'a'), receipt('11', '1000001', 'b'), receipt('11', '999999', 'c')] }, new Date('2026-12-10Z'));
  assert.equal(rows[0].atomic, 2000000n);
  assert.equal(rows[0].cumulativeAtomic, 4000000n);
  assert.equal(rows[1].receipts.length, 2);
  assert.equal(formatBurnAmount(123456789012345678n), '123,456,789,012.345678');
});
test('rejects duplicate, future and invalid receipts rather than overstating burns', () => {
  const valid = receipt('11', '1000000', 'a');
  for (const receipts of [[valid, valid], [receipt('12', '1', 'b')], [{ ...valid, atomic: '-1' }], [{ ...valid, hash: 'invalid' }]]) {
    assert.throws(() => monthlyBurnHistory({ startMonth: '2026-11', receipts }, new Date('2026-11-04Z')));
  }
});
