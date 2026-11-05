import { useEffect, useState } from 'react';
import { formatBurnAmount, monthlyBurnHistory } from './monthly-burns.mjs';

export default function MonthlyBurnBoard() {
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
  return (
    <section className="monthly-burn-board" aria-labelledby="monthly-burn-heading">
      <h2 id="monthly-burn-heading">Monthly Burn History</h2>
      {rows.length > 0 ? (
        <div className="monthly-burn-scroll" role="region" aria-label="Monthly BONEZ totals" tabIndex={0}>
          <ul>
            {rows.map(({ month, atomic }) => (
              <li key={month}>
                <time dateTime={month}>
                  {new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-US', {
                    month: 'long', year: 'numeric', timeZone: 'UTC',
                  })}
                </time>
                <strong>{formatBurnAmount(atomic)} BONEZ</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : <p role="status">{error ? 'Burn history temporarily unavailable.' : 'Loading monthly burns…'}</p>}
      {error && rows.length > 0 && <small role="status">Refresh delayed · showing the last loaded history.</small>}
    </section>
  );
}
