import ledger from './monthly-burns.json';
import { formatBurnAmount, monthlyBurnHistory } from './monthly-burns.mjs';

export default function MonthlyBurnBoard() {
  const rows = monthlyBurnHistory(ledger);
  const total = rows[0]?.cumulativeAtomic || 0n;
  const monthLabel = month => new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return <section className="monthly-burn-board" aria-labelledby="monthly-burn-heading">
    <div className="monthly-burn-heading"><div><span className="burn-eyebrow">THE FURNACE RECORD</span><h2 id="monthly-burn-heading">Monthly Burn History</h2></div><div className="monthly-burn-total"><span>Recorded since November 2026</span><strong>{total > 0n ? `${formatBurnAmount(total)} BONEZ` : 'Awaiting first record'}</strong></div></div>
    <p>Watch the furnace grow, one month at a time. This board records confirmed BONEZ burns starting in November 2026. Contributions waiting in the burn pile are counted after the team burns them and adds the verified receipt.</p>
    <ul className="monthly-burn-list">{rows.map(row => <li key={row.month}><div className="monthly-burn-row"><h3>{monthLabel(row.month)}</h3><strong>{row.receipts.length ? `${formatBurnAmount(row.atomic)} BONEZ burned` : 'Awaiting confirmed burn record'}</strong></div>{row.receipts.length > 0 && <><p>Running total: {formatBurnAmount(row.cumulativeAtomic)} BONEZ</p><div className="monthly-burn-receipts">{row.receipts.map((receipt, index) => <a key={receipt.hash} href={`https://explorer.multiversx.com/transactions/${receipt.hash}`} target="_blank" rel="noreferrer">Verify burn {index + 1} ↗</a>)}</div></>}</li>)}</ul>
    <small>Months use UTC. Earlier burns remain in the token’s all-time stats above.</small>
  </section>;
}
