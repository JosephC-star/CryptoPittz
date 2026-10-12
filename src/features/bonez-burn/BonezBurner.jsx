import { useEffect, useRef, useState } from 'react';
import { BONEZ_TOKEN, bonezHuman, burnAtomic, validateBurnToken } from './amounts';
import './burner.css';

const display = (value) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
async function json(url, signal) {
  const response = await fetch(url, { signal, cache: 'no-store' });
  if (!response.ok) throw Error('Live BONEZ data is temporarily unavailable.');
  return response.json();
}
function FurnaceScene({ firing, expanded }) {
  return <div className={`burn-scene ${firing ? 'burn-firing' : ''} ${expanded ? 'burn-scene-expanded' : ''}`} role="img" aria-label="Two neon Pittz workers shoveling bones into an industrial furnace with fire, embers and steam">
    <div className="burn-room" />
    <div className="burn-fire"><i /><i /><i /></div>
    <div className="burn-plaque">BONEZ BURNER<small>YOU EARN, WE BURN</small></div>
    <div className="burn-worker burn-worker-left" /><div className="burn-worker burn-worker-right" />
    <div className="burn-bones" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <span key={i} style={{ '--i': i }}>🦴</span>)}</div>
    <div className="burn-feed burn-feed-left" aria-hidden="true">🦴</div><div className="burn-feed burn-feed-right" aria-hidden="true">🦴</div>
    <div className="burn-steam burn-steam-left" /><div className="burn-steam burn-steam-right" />
    <div className="burn-embers" aria-hidden="true">{Array.from({ length: 22 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div>
    <div className="burn-scene-vignette" />
    <span className="burn-scene-label">{firing ? 'FURNACE PREVIEW · NO TOKENS SPENT' : 'THE PACK’S INCINERATOR'}</span>
  </div>;
}
export default function BonezBurner({ address, onConnect }) {
  const [expanded, setExpanded] = useState(false);
  const [firing, setFiring] = useState(false);
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState(null);
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState('');
  const [inputError, setInputError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    const controller = new AbortController();
    setBalance(null); setToken(null); setError('');
    async function load() {
      try {
        const details = validateBurnToken(await json(`https://api.multiversx.com/tokens/${BONEZ_TOKEN}`, controller.signal));
        if (!controller.signal.aborted) setToken(details);
      } catch (e) { if (!controller.signal.aborted) setError(e.message); }
      if (address) {
        try {
          const response = await fetch(`https://api.multiversx.com/accounts/${address}/tokens/${BONEZ_TOKEN}`, { signal: controller.signal, cache: 'no-store' });
          if (response.status === 404) { if (!controller.signal.aborted) setBalance('0'); return; }
          if (!response.ok) throw Error('Your BONEZ balance could not be loaded.');
          const walletToken = await response.json();
          if (walletToken.identifier !== BONEZ_TOKEN) throw Error('Wallet token could not be verified.');
          bonezHuman(walletToken.balance);
          if (!controller.signal.aborted) setBalance(walletToken.balance);
        } catch (e) { if (!controller.signal.aborted) setError(e.message); }
      }
    }
    void load(); return () => controller.abort();
  }, [address, refresh]);
  function preview() {
    clearTimeout(timer.current); setFiring(true);
    timer.current = setTimeout(() => setFiring(false), 6500);
  }
  function changeAmount(value) {
    setAmount(value); setInputError('');
    if (value) {
      try { const atomic = burnAtomic(value); if (balance !== null && atomic > BigInt(balance)) throw Error('That amount exceeds your wallet balance.'); }
      catch (e) { setInputError(e.message); }
    }
  }
  return <section id="bonez-burner" className={`burner ${expanded ? 'burner-open' : ''}`}>
    <div className="burner-header"><div><span className="burn-eyebrow">THE PACK’S INDUSTRIAL QUARTER</span><h2>BONEZ Burner</h2><p>Feed the furnace. Fuel the legend.</p></div><span className="burner-status"><i /> FURNACE ONLINE <small>Burn connection in development</small></span></div>
    <div className="burner-layout">
      <div className="burner-showcase"><FurnaceScene firing={firing} expanded={expanded} /><div className="burn-scene-actions"><button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>{expanded ? 'Close furnace room ↑' : 'Enter the furnace room →'}</button><button type="button" onClick={preview} disabled={firing}>{firing ? 'Furnace firing…' : 'Preview the fire 🔥'}</button></div></div>
      <div className="burn-control"><span className="burn-eyebrow">FURNACE CONTROL</span><h3>You earn, we burn.</h3><p>Real BONEZ. Permanent destruction. Every completed burn will have an on-chain receipt.</p>
        <div className="burn-wallet"><span>Your wallet BONEZ</span><strong>{address ? balance === null ? 'Loading…' : display(bonezHuman(balance)) : 'Connect to view'}</strong><small>Only liquid tokens in your wallet</small></div>
        <label htmlFor="burn-amount">Amount of BONEZ</label><div className="burn-input"><input id="burn-amount" type="text" inputMode="decimal" value={amount} onChange={e => changeAmount(e.target.value)} placeholder="0.00" autoComplete="off" aria-describedby="burn-input-error burn-route-note" /><span>BONEZ</span></div>
        <div className="burn-percent">{[10,25,50].map(n => <button key={n} type="button" disabled={balance === null || BigInt(balance || '0') === 0n} onClick={() => changeAmount(bonezHuman(BigInt(balance) * BigInt(n) / 100n))}>{n}%</button>)}</div>
        <div id="burn-input-error" role="status" className="burn-error">{inputError}</div>
        {!address ? <button className="burn-main" type="button" onClick={onConnect}>Connect wallet</button> : <button className="burn-main" type="button" disabled>Burn connection coming soon</button>}
        <p id="burn-route-note" className="burn-route-note">The furnace is ready for a test fire. Wallet burning stays locked until the BONEZ burn route is verified. Previewing spends no tokens.</p>
        <a href={`https://explorer.multiversx.com/tokens/${BONEZ_TOKEN}`} target="_blank" rel="noreferrer">Verify BONEZ on Explorer ↗</a>
      </div>
    </div>
    <div className="burn-stats"><div><span>Total BONEZ burned · all time</span><strong>{token ? display(bonezHuman(token.burnt)) : '—'}</strong></div><div><span>Current token supply</span><strong>{token ? display(token.supply) : '—'}</strong></div><div><span>Verified token</span><strong>{BONEZ_TOKEN}</strong><small>6 decimal places · Mainnet</small></div><button type="button" onClick={() => setRefresh(n => n + 1)}>Refresh stats ↻</button></div>
    {error && <p className="burn-error" role="status">{error}</p>}
  </section>;
}
