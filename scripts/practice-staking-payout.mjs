// Offline rehearsal from normalized, independently reconciled snapshot evidence.
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {allocate, COUNTS, DAY, schedule} from '../public/staking-preview/model.js';

function validState(state) {
  return state && typeof state.wallet === 'string' && state.wallet.length > 0 &&
    typeof state.listed === 'boolean' && typeof state.escrow === 'boolean';
}

function replayHolding(nft, start, cutoff) {
  if (nft.evidence !== 'verified' || !validState(nft.anchor) || !Array.isArray(nft.events)) return null;
  let {wallet, listed, escrow} = nft.anchor;
  let heldSince = start;
  let previousTime = start;

  // The anchor includes events at start. Later events arrive in finalized chain order.
  for (const event of nft.events) {
    const {timestamp, before, after} = event;
    if (!Number.isSafeInteger(timestamp) || timestamp <= start || timestamp < previousTime || !validState(before) || !validState(after)) return null;
    previousTime = timestamp;
    if (timestamp > cutoff) continue;
    if (before.wallet !== wallet || before.listed !== listed || before.escrow !== escrow) return null;
    if (after.wallet !== wallet || (escrow && !after.escrow)) heldSince = timestamp;
    ({wallet, listed, escrow} = after);
  }
  return {collection: nft.collection, nonce: nft.nonce, rank: nft.rank, wallet, listed: listed || escrow, heldSince};
}

export function practicePayout({cutoff, week, nfts}) {
  const snapshot = Date.parse(cutoff);
  const budget = schedule().weeks[week - 1]?.budget;
  if (!Number.isFinite(snapshot) || !Number.isInteger(week) || budget === undefined || !Array.isArray(nfts)) {
    throw Error('Provide a replay cutoff, a valid schedule week and the NFT evidence rows.');
  }
  const seen = new Set();
  const counts = {original: 0, vice: 0};
  const holdings = [];
  const unresolved = [];
  for (const nft of nfts) {
    const id = `${nft.collection}:${nft.nonce}`;
    if (!Object.hasOwn(counts, nft.collection) || !Number.isSafeInteger(nft.nonce) || nft.nonce < 1 || seen.has(id)) {
      throw Error(`Invalid or duplicate NFT identity: ${id}`);
    }
    seen.add(id);
    counts[nft.collection]++;
    const holding = replayHolding(nft, snapshot - 2 * DAY, snapshot);
    if (holding) holdings.push(holding);
    else unresolved.push(id);
  }

  const coverage = Object.entries(COUNTS).map(([collection, tiers]) => ({
    collection, observed: counts[collection], expected: tiers.reduce((sum, count) => sum + count, 0),
  }));
  const report = {mode: 'practice-only', cutoff, week, coverage, unresolved};
  if (unresolved.length || coverage.some(row => row.observed !== row.expected)) {
    return {...report, status: 'blocked'};
  }

  const allocation = allocate(budget, snapshot, holdings);
  const wallets = new Map();
  const rows = allocation.rows.map(({id, wallet, status, amount}) => {
    if (status === 'Eligible') wallets.set(wallet, (wallets.get(wallet) ?? 0n) + amount);
    return {id, wallet, status, amountAtomic: String(amount)};
  });
  const walletTotal = [...wallets.values()].reduce((sum, amount) => sum + amount, 0n);
  if (walletTotal + allocation.unallocated !== budget) throw Error('Practice totals do not reconcile.');
  return {
    ...report, status: 'calculated', budgetAtomic: String(budget), unallocatedAtomic: String(allocation.unallocated),
    rows, wallets: [...wallets].map(([wallet, amount]) => ({wallet, amountAtomic: String(amount)})),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 3) throw Error('Usage: node scripts/practice-staking-payout.mjs EVIDENCE.json');
  const report = practicePayout(JSON.parse(await readFile(process.argv[2], 'utf8')));
  console.log(JSON.stringify(report, null, 2));
  if (report.status === 'blocked') process.exitCode = 1;
}
