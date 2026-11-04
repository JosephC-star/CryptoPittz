import { BURN_PILE_ADDRESS } from '../../src/features/bonez-burn/contributionValidation.js';
import { monthlyBurnHistory } from '../../src/features/bonez-burn/monthly-burns.mjs';

const START_MONTH = '2026-11';
const START = Date.parse(`${START_MONTH}-01T00:00:00Z`) / 1000;
const TOKEN_HEX = Buffer.from('BONEZ-ff9a73').toString('hex');

export function burnReceipt(tx) {
  if (tx.status !== 'success' || tx.sender !== BURN_PILE_ADDRESS || tx.receiver !== BURN_PILE_ADDRESS || tx.function !== 'ESDTLocalBurn') return null;
  const parts = Buffer.from(tx.data || '', 'base64').toString().split('@');
  if (parts[0] !== 'ESDTLocalBurn' || parts[1] !== TOKEN_HEX) return null;
  if (parts.length !== 3 || !/^[0-9a-f]+$/i.test(parts[2])) throw Error('Invalid burn payload.');
  const atomic = BigInt(`0x${parts[2]}`);
  const events = tx.logs?.events?.filter(event => event.identifier === 'ESDTLocalBurn' && event.address === BURN_PILE_ADDRESS && Buffer.from(event.topics?.[0] || '', 'base64').toString() === 'BONEZ-ff9a73');
  if (atomic <= 0n || events?.length !== 1 || Buffer.from(events[0].topics?.[1] || '', 'base64').some(byte => byte !== 0) || BigInt(`0x${Buffer.from(events[0].topics?.[2] || '', 'base64').toString('hex') || '0'}`) !== atomic) throw Error('Burn event could not be verified.');
  if (!Number.isSafeInteger(tx.timestamp) || tx.timestamp < START) throw Error('Invalid burn date.');
  return { hash: tx.txHash, burnedAt: new Date(tx.timestamp * 1000).toISOString(), atomic: atomic.toString() };
}

export async function loadBurnHistory(fetcher = fetch, now = new Date()) {
  const receipts = [];
  const seen = new Set();
  for (let page = 0; page < 10; page++) {
    const query = new URLSearchParams({ from: String(page * 25), size: '25', order: 'asc', sender: BURN_PILE_ADDRESS, function: 'ESDTLocalBurn', status: 'success', after: String(START - 1), before: String(Math.floor(now.getTime() / 1000) + 1), withLogs: 'true' });
    const response = await fetcher(`https://api.multiversx.com/accounts/${BURN_PILE_ADDRESS}/transactions?${query}`, { redirect: 'error', signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw Error('Burn provider unavailable.');
    const transactions = await response.json();
    if (!Array.isArray(transactions) || transactions.length > 25) throw Error('Invalid burn history.');
    for (const tx of transactions) {
      // A repeated page must fail rather than silently returning a partial total.
      if (seen.has(tx.txHash)) throw Error('Repeated transaction page.');
      seen.add(tx.txHash);
      const receipt = burnReceipt(tx);
      if (receipt) receipts.push(receipt);
    }
    if (transactions.length < 25) {
      const ledger = { startMonth: START_MONTH, receipts };
      monthlyBurnHistory(ledger, now);
      return ledger;
    }
  }
  throw Error('Burn history exceeds query limit.');
}

export async function handler(event) {
  const reply = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': statusCode === 200 ? 'public, max-age=30, s-maxage=60' : 'no-store', 'X-Content-Type-Options': 'nosniff' }, body: JSON.stringify(body) });
  if (event.httpMethod !== 'GET') return reply(405, { error: 'GET required.' });
  try { return reply(200, await loadBurnHistory()); }
  catch { return reply(502, { error: 'Burn history is temporarily unavailable.' }); }
}
