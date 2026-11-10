import {accounting, claim, emptyLedger, validateSnapshot} from './claim-model.js';
const $ = id => document.getElementById(id);
const format = value => {
  const n = BigInt(value);
  return (n / 1000000n).toLocaleString('en-US') + '.' + String(n % 1000000n).padStart(6, '0');
};
const date = time => new Date(time).toISOString().replace('T', ' ').replace('.000Z', ' UTC');
let snapshot, now, storageKey;

function readLedger() {
  const saved = localStorage.getItem(storageKey);
  const ledger = saved === null ? emptyLedger(snapshot) : JSON.parse(saved);
  accounting(snapshot, ledger, now);
  return ledger;
}
function render() {
  const ledger = readLedger();
  const row = snapshot.wallets.find(row => row.wallet === $('wallet-select').value);
  const receipt = ledger.receipts[row.wallet];
  const totals = accounting(snapshot, ledger, now);
  $('clock').textContent = date(now);
  $('wallet-address').textContent = row.wallet;
  $('allocation').textContent = format(row.amountAtomic);
  const reasons = Object.entries(row.exclusions).map(([reason, count]) => count + ' ' + reason.toLowerCase()).join(' · ');
  $('eligibility').textContent = row.eligible + ' eligible Pittz' + (reasons ? ' · ' + reasons : '');
  $('receipt').textContent = receipt ? format(receipt.amountAtomic) + ' practice BONEZ saved at ' + date(receipt.timestamp) : 'No saved claim for this wallet.';
  $('claim').disabled = !navigator.locks || row.amountAtomic === '0' || !!receipt ||
    now < snapshot.open || now >= snapshot.deadline;
  $('claim').textContent = receipt ? 'Already claimed ✓' : 'Claim practice BONEZ';
  for (const [id, key] of [['claimed-total', 'claimed'], ['remaining-total', 'claimable'],
    ['expired-total', 'expired'], ['unallocated-total', 'unallocated']]) {
    $(id).textContent = format(totals[key]);
  }
  const sum = Object.values(totals).reduce((a, b) => a + b, 0n);
  if (sum !== BigInt(snapshot.budgetAtomic)) throw Error('Pool reconciliation failed.');
  $('reconciled').textContent = 'All balances reconcile to ' + format(sum) + ' practice BONEZ.';
}
function showError(error) {
  $('message').textContent = error.message;
  $('claim').disabled = true;
}
async function saveClaim() {
  const wallet = $('wallet-select').value;
  const timestamp = now;
  const simulateFailure = $('fail-next').checked;
  $('fail-next').checked = false;
  $('claim').disabled = true;
  try {
    await navigator.locks.request(storageKey, () => {
      const ledger = readLedger();
      const next = claim(snapshot, ledger, wallet, timestamp);
      if (simulateFailure) throw Error('Simulated save failure. The ledger is unchanged. Retry your practice claim.');
      localStorage.setItem(storageKey, JSON.stringify(next));
    });
    $('message').textContent = 'Practice claim saved. Refresh to verify your receipt.';
  } catch (error) {
    $('message').textContent = error.message;
  }
  try { render(); } catch (error) { showError(error); }
}

try {
  const response = await fetch('./claim-fixture.json');
  if (!response.ok) throw Error('Practice snapshot could not be loaded.');
  snapshot = validateSnapshot(await response.json());
  now = snapshot.open;
  storageKey = 'pittz-mock-claims-v1-' + snapshot.id;
  for (const row of snapshot.wallets) {
    const option = document.createElement('option');
    option.value = row.wallet;
    option.textContent = (row.eligible ? row.eligible + ' eligible' : 'Ineligible') + ' · ' +
      row.wallet.slice(0, 12) + '…' + row.wallet.slice(-8);
    $('wallet-select').append(option);
  }
  $('wallet-select').value = snapshot.wallets.find(row => row.eligible).wallet;
  $('wallet-select').disabled = false;
  $('window').textContent = 'Illustrative opening ' + date(snapshot.open) + ' · Deadline ' + date(snapshot.deadline) + ' (exclusive).';
  $('message').textContent = navigator.locks ? 'Ready to test a practice claim.' : 'This browser needs Web Locks support to save mock claims safely.';
  render();
  $('wallet-select').addEventListener('change', () => { try { render(); } catch (e) { showError(e); } });
  document.querySelectorAll('[data-time]').forEach(button => button.addEventListener('click', () => {
    now = {before: snapshot.open - 1, open: snapshot.open,
      last: snapshot.deadline - 1, closed: snapshot.deadline}[button.dataset.time];
    try { render(); } catch (e) { showError(e); }
  }));
  $('claim').addEventListener('click', saveClaim);
  $('reset').addEventListener('click', async () => {
    if (!navigator.locks) return;
    try {
      await navigator.locks.request(storageKey, () => localStorage.removeItem(storageKey));
      $('message').textContent = 'Practice receipts cleared. Snapshot allocations are fixed.';
      render();
    } catch (error) { showError(error); }
  });
  addEventListener('storage', event => {
    if (event.key === storageKey || event.key === null) {
      try { render(); } catch (error) { showError(error); }
    }
  });
} catch (error) { showError(error); }
