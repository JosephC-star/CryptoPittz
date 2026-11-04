import test from 'node:test';
import assert from 'node:assert/strict';
import { burnReceipt, loadBurnHistory, handler } from '../netlify/functions/bonez-burn-history.mjs';
import { BURN_PILE_ADDRESS as wallet } from '../src/features/bonez-burn/contributionValidation.js';
const encode = value => Buffer.from(value).toString('base64');
const token = Buffer.from('BONEZ-ff9a73').toString('hex');
const tx = () => ({ txHash: 'a'.repeat(64), timestamp: 1793642865, status: 'success', sender: wallet, receiver: wallet, function: 'ESDTLocalBurn', data: encode(`ESDTLocalBurn@${token}@f49b44d640`), logs: { events: [{ identifier: 'ESDTLocalBurn', address: wallet, topics: [encode('BONEZ-ff9a73'), '', Buffer.from('f49b44d640','hex').toString('base64')] }] } });
const now = new Date('2026-11-04T12:00:00Z');
test('requires a successful team-wallet BONEZ burn and matching emitted amount', () => {
  assert.equal(burnReceipt(tx()).atomic, '1050577000000');
  for (const change of [{ status: 'pending' }, { sender: 'other' }, { function: 'ESDTTransfer' }, { receiver: 'other' }]) assert.equal(burnReceipt({ ...tx(), ...change }), null);
  assert.equal(burnReceipt({ ...tx(), data: encode('ESDTLocalBurn@414243@01') }), null);
  assert.throws(() => burnReceipt({ ...tx(), logs: undefined }));
  const wrong = tx(); wrong.logs.events[0].topics[2] = encode('wrong');
  assert.throws(() => burnReceipt(wrong));
});
test('queries complete history since November and produces exact receipts', async () => {
  const ledger = await loadBurnHistory(async url => {
    const query = new URL(url).searchParams;
    assert.equal(query.get('withLogs'), 'true');
    assert.equal(query.get('sender'), wallet);
    assert.equal(query.get('function'), 'ESDTLocalBurn');
    return { ok: true, json: async () => [tx()] };
  }, now);
  assert.equal(ledger.receipts[0].atomic, '1050577000000');
  assert.equal(ledger.startMonth, '2026-11');
});
test('pagination includes later pages and rejects repeated or failed pages', async () => {
  const page = Array.from({ length: 25 }, (_, i) => ({ ...tx(), txHash: i.toString(16).padStart(64, '0') }));
  let calls = 0;
  const ledger = await loadBurnHistory(async () => ({ ok: true, json: async () => ++calls === 1 ? page : [{ ...tx(), txHash: 'f'.repeat(64) }] }), now);
  assert.equal(ledger.receipts.length, 26);
  await assert.rejects(loadBurnHistory(async () => ({ ok: true, json: async () => page }), now), /Repeated/);
  await assert.rejects(loadBurnHistory(async () => ({ ok: false }), now));
  assert.equal((await handler({ httpMethod: 'POST' })).statusCode, 405);
});
