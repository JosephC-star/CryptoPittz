import { useEffect, useState } from 'react';
import { formatBurnAmount, monthlyBurnHistory } from './monthly-burns.mjs';

export default function MonthlyBurnBoard() {
  const [month, setMonth] = useState('all');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    let stopped = false, running = false;
    const controller = new AbortController();
    async function refresh() {
      if (running || document.hidden) return;
      running = true;
      try {
        const response = await fetch('/.netlify/functions/bonez-burn-history', { signal: controller.signal });
        if (!response.ok) throw Error('Burn history unavailable.');
        const history = monthlyBurnHistory(await response.json());
        if (!stopped) { setRows(history); setError(false); }
      } catch { if (!stopped) setError(true); }
      finally { running = false; }
    }
    refresh();
    const timer = setInterval(refresh, 60000);
    document.addEventListener('visibilitychange', refresh);
    return () => { stopped = true; controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  const selected = month === 'all' ? rows : rows.filter(row => row.month === month);
  const total = selected.reduce((sum, row) => sum + row.atomic, 0n);
  const monthLabel = value => new Date(`${value}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return <section className="monthly-burn-board" aria-labelledby="monthly-burn-heading">
    <div className="monthly-burn-heading">
      <h2 id="monthly-burn-heading">Monthly Burn History</h2>
      <label className="monthly-burn-filter"><span className="sr-only">Filter burns by month</span><select value={month} onChange={event => setMonth(event.target.value)}><option value="all">All months</option>{rows.map(row => <option key={row.month} value={row.month}>{monthLabel(row.month)}</option>)}</select></label>
    </div>
    <div className="monthly-burn-total" aria-live="polite"><strong>{selected.length ? formatBurnAmount(total) : '—'} BONEZ</strong></div>
    {error && <small role="status">{rows.length ? 'Refresh delayed · showing last loaded total' : 'Burn total temporarily unavailable'}</small>}
  </section>;
}
