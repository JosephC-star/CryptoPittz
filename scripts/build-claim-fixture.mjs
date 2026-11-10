// Usage: node scripts/build-claim-fixture.mjs VERIFIED-PAYOUT.json
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {schedule} from '../public/staking-preview/model.js';
import {validateSnapshot} from '../public/staking-preview/claim-model.js';

const report = JSON.parse(await readFile(process.argv[2], 'utf8'));
if (report.mode !== 'practice-only' || report.status !== 'calculated' ||
    report.cutoff !== '2026-11-10T20:26:36Z' || report.week !== 1 ||
    report.unresolved.length || report.coverage.some(row => row.observed !== row.expected)) {
  throw Error('Provide the reconciled Nov 8–10 practice payout.');
}
const wallets = new Map();
for (const row of report.rows) {
  if (!wallets.has(row.wallet)) wallets.set(row.wallet, {
    wallet: row.wallet, amountAtomic: '0', eligible: 0, exclusions: {},
  });
  const wallet = wallets.get(row.wallet);
  wallet.amountAtomic = String(BigInt(wallet.amountAtomic) + BigInt(row.amountAtomic));
  if (row.status === 'Eligible') wallet.eligible++;
  else wallet.exclusions[row.status] = (wallet.exclusions[row.status] || 0) + 1;
}
const actual = [...wallets.values()].filter(row => row.eligible).map(row => [row.wallet, row.amountAtomic]).sort();
const expected = report.wallets.map(row => [row.wallet, row.amountAtomic]).sort();
if (JSON.stringify(actual) !== JSON.stringify(expected)) throw Error('Per-wallet totals conflict.');
const week = schedule().weeks[0];
if (report.budgetAtomic !== String(week.budget)) throw Error('Week 1 budget conflicts.');
const snapshot = {
  mode: 'practice-only', sourceLibraryFileId: 'libfile_a70f7dbe46d48191a416d94e947177c7', cutoff: report.cutoff, week: 1,
  open: week.open, deadline: week.deadline,
  budgetAtomic: report.budgetAtomic, unallocatedAtomic: report.unallocatedAtomic,
  wallets: [...wallets.values()].sort((a, b) => a.wallet.localeCompare(b.wallet)),
};
snapshot.id = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
validateSnapshot(snapshot);
await writeFile(new URL('../public/staking-preview/claim-fixture.json', import.meta.url), JSON.stringify(snapshot));
console.log('Saved verified practice fixture with', actual.length, 'eligible wallets.');
