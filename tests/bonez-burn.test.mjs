import test from 'node:test';
import assert from 'node:assert/strict';
import { burnAtomic, bonezHuman, validateBurnToken } from '../src/features/bonez-burn/amounts.js';
test('BONEZ quantities preserve all six decimals without floating point', () => {
  assert.equal(burnAtomic('9007199254740993.123456'), 9007199254740993123456n);
  assert.equal(burnAtomic('0.000001'), 1n);
  assert.equal(bonezHuman('9007199254740993123456'), '9007199254740993.123456');
  assert.equal(bonezHuman(0n), '0');
});
test('invalid, negative and overprecision amounts cannot pass validation', () => {
  for (const value of ['0', '-1', '1e6', 'NaN', '0.0000001', '', '1.2.3']) assert.throws(() => burnAtomic(value));
});
test('live stats require the exact token and decimals', () => {
  const token = { identifier: 'BONEZ-ff9a73', type: 'FungibleESDT', decimals: 6, burnt: '1234567', supply: '200.4' };
  assert.equal(validateBurnToken(token), token);
  for (const change of [{ decimals: 18 }, { identifier: 'BONEZ-xxxxxx' }, { burnt: 'NaN' }, { supply: null }]) assert.throws(() => validateBurnToken({ ...token, ...change }));
});

test('whole BONEZ and six-decimal input produce the same atomic amount', () => {
  assert.equal(burnAtomic('1000'), 1000000000n);
  assert.equal(burnAtomic('1000.000000'), burnAtomic('1000'));
  assert.equal(burnAtomic('1000000000'), 1000000000000000n);
});
