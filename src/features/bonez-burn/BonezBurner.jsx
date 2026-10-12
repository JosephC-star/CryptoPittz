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
    <div className="burn-flare" aria-hidden="true"><i /><i /></div>
    <div className="burn-smoke" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ '--smoke-delay': `${-i * .9}s`, '--smoke-x': `${36 + (i % 4) * 8}%`, '--smoke-drift': `${(i % 2 ? 1 : -1) * (18 + i * 5)}px`, '--smoke-size': `${48 + (i % 3) * 22}px` }} />)}</div>
    <div className="burn-worker burn-worker-left">{Array.from({length:6}, (_, i) => <span className="burn-pose burn-smooth-pose" key={i} style={{ "--pose": i, backgroundImage: `url(/images/bonez-burn/left-smooth-${i}.webp)` }} />)}</div><div className="burn-worker burn-worker-right">{Array.from({length:6}, (_, i) => <span className="burn-pose burn-smooth-pose" key={i} style={{ "--pose": i, backgroundImage: `url(/images/bonez-burn/right-smooth-${i}.webp)` }} />)}</div>
    <div className="burn-bones" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <span key={i} style={{ '--i': i }}>🦴</span>)}</div>
    {['left', 'right'].map(side => <div className={`burn-flight-bank burn-flight-${side}`} key={side} aria-hidden="true">{Array.from({length:5}, (_, i) => <svg className="burn-flight-bone" key={i} style={{ '--bone-n': i, '--bone-turn': `${i*43}deg`, '--bone-spread': `${(i-2)*8}px` }} viewBox="0 0 64 32"><path fill="#ffe2a0" stroke="#b67b31" strokeWidth="2" d="M16 10C13 1 3 1 3 8C3 12 6 14 7 16C6 18 3 20 3 24C3 31 13 31 16 22C25 20 39 20 48 22C51 31 61 31 61 24C61 20 58 18 57 16C58 14 61 12 61 8C61 1 51 1 48 10C39 12 25 12 16 10Z"/><path fill="none" stroke="#fff8de" strokeWidth="2" d="M18 13Q32 16 46 13"/></svg>)}</div>)}
    <div className="burn-steam burn-steam-left" /><div className="burn-steam burn-steam-right" />
    <div className="burn-embers" aria-hidden="true">{Array.from({ length: 22 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div>
    <div className="burn-scene-vignette" />
    <span className="burn-scene-label">{firing ? 'FURNACE PREVIEW · NO TOKENS SPENT' : 'THE PACK’S INCINERATOR'}</span>
  </div>;
}
export default function BonezBurner({ address, onConnect, onFireChange, dedicated = false }) {
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
  useEffect(() => { onFireChange?.(firing); }, [firing, onFireChange]);
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
    <div className="burner-header"><div><span className="burn-eyebrow">THE PACK’S INDUSTRIAL QUARTER</span><h2>{dedicated ? "The Furnace Room" : "Pittensor"}</h2><p>Feed the furnace. Fuel the legend.</p></div><span className="burner-status"><i /> FURNACE ONLINE <small>Burn connection in development</small></span></div>
    <div className="burner-layout">
      <div className="burner-showcase"><FurnaceScene firing={firing} expanded={expanded} /><div className="burn-scene-actions"><button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>{expanded ? 'Close furnace room ↑' : 'Expand the furnace room →'}</button><button type="button" onClick={preview} disabled={firing}>{firing ? 'Furnace firing…' : 'Preview the fire 🔥'}</button></div></div>
      <div className="burn-control"><span className="burn-eyebrow">FURNACE CONTROL</span><h3>You earn, we burn!</h3><p>Real BONEZ. Permanent destruction. Every completed burn will have an on-chain receipt.</p>
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
