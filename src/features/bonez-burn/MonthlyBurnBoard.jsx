import { useState } from 'react';
import ledger from './monthly-burns.json';
import { formatBurnAmount, monthlyBurnHistory } from './monthly-burns.mjs';

export default function MonthlyBurnBoard() {
  const [month, setMonth] = useState('all');
  const rows = monthlyBurnHistory(ledger);
  const selected = month === 'all' ? rows : rows.filter(row => row.month === month);
  const hasRecords = selected.some(row => row.receipts.length > 0);
  const total = selected.reduce((sum, row) => sum + row.atomic, 0n);
  const monthLabel = value => new Date(`${value}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return <section className="monthly-burn-board" aria-labelledby="monthly-burn-heading">
    <div className="monthly-burn-heading">
      <h2 id="monthly-burn-heading">Monthly Burn History</h2>
      <label className="monthly-burn-filter"><span className="sr-only">Filter burns by month</span><select value={month} onChange={event => setMonth(event.target.value)}><option value="all">All months</option>{rows.map(row => <option key={row.month} value={row.month}>{monthLabel(row.month)}</option>)}</select></label>
    </div>
    <div className="monthly-burn-total"><strong>{hasRecords ? formatBurnAmount(total) : '—'} BONEZ</strong></div>
  </section>;
}
