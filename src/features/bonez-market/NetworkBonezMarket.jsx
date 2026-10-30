import useBonezMarket from './useBonezMarket';
import {formatBonezUsd} from '../../utils/formatters';
import './network-market.css';

export default function NetworkBonezMarket() {
  const {market, marketStatus, marketUpdated} = useBonezMarket(true, {historyEnabled: false});
  const status = marketStatus === 'connected' ? 'Live · USD'
    : marketStatus === 'unavailable' ? 'Data unavailable'
    : marketStatus === 'busy' ? 'Retrying data…' : 'Loading data…';
  const rows = [
    ['BONEZ price', market?.priceUsd],
    ['24h volume', market?.volume?.h24],
    ['Liquidity', market?.liquidity?.usd],
  ];

  return <section className="network-bonez-market" aria-label="Live BONEZ market data">
    <div className="network-market-caption">
      <span>BONEZ Market</span>
      <span role="status" title={marketUpdated ? `Last updated ${marketUpdated.toLocaleTimeString()}. Source: Dexscreener, BONEZ / EGLD on xExchange.` : undefined}>{status}</span>
    </div>
    <div className="pittz-network-status">
      {rows.map(([label, value]) => <div key={label}>
        <span>{label}</span>
        <strong>{value == null || value === '' ? '—' : formatBonezUsd(value)}</strong>
      </div>)}
    </div>
  </section>;
}
