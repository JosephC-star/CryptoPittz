import { useEffect, useId, useRef, useState } from 'react';
import { BONEZ_TOKEN, bonezHuman, burnAtomic, validateBurnToken } from './amounts';
import './burner.css';
import FurnaceValve from './FurnaceValve';
import { prepareBurn, submitBurn, pendingBurn } from './burnTransactions';
import { assertBurnReceipt } from './burnValidation';

const display = (value) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
async function json(url, signal) {
  const response = await fetch(url, { signal, cache: 'no-store' });
  if (!response.ok) throw Error('Live BONEZ data is temporarily unavailable.');
  return response.json();
}
function FurnaceScene({ firing, expanded, celebration }) {
  const gaugeId = useId();
  return <div className={`burn-scene ${firing ? 'burn-firing' : ''} ${expanded ? 'burn-scene-expanded' : ''}`} role="img" aria-label="Two neon Pittz workers shoveling bones into an industrial furnace with fire, embers and steam">
    <div className="burn-room" />
    <div className="furnace-lights" aria-hidden="true"><i className="furnace-light-magenta" /><i className="furnace-light-violet" /><i className="furnace-light-green" /></div>
    <div className="furnace-gold-sheen" aria-hidden="true" />
    <div className="burn-fire"><i /><i /><i /></div>
    <div className="furnace-heat-haze" aria-hidden="true"><i/><i/><i/></div>
    <div className="burn-flare" aria-hidden="true"><i /><i /></div>
    <div className="burn-smoke" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ '--smoke-delay': `${-i * .9}s`, '--smoke-x': `${36 + (i % 4) * 8}%`, '--smoke-drift': `${(i % 2 ? 1 : -1) * (18 + i * 5)}px`, '--smoke-size': `${48 + (i % 3) * 22}px` }} />)}</div>
    <div className="burn-worker burn-worker-left">{Array.from({length:12}, (_, i) => <span className="burn-pose burn-smooth-pose" data-pose={i} key={i} style={{ "--pose": i, backgroundImage: `url(/images/bonez-burn/left-twelve-${i}.webp)` }} />)}</div><div className="burn-worker burn-worker-right">{Array.from({length:12}, (_, i) => <span className="burn-pose burn-smooth-pose" data-pose={i} key={i} style={{ "--pose": i, backgroundImage: `url(/images/bonez-burn/right-twelve-${i}.webp)` }} />)}</div>
    <div className="furnace-bone-pile" aria-hidden="true">{Array.from({length:36}, (_, i) => <svg key={i} viewBox="0 0 64 32" style={{ '--pile-x': `${10+(i*23)%76}%`, '--pile-y': `${Math.max(0, 42-Math.abs((10+(i*23)%76)-50)*.7)+(i%3)*7}%`, '--pile-turn': `${i*47}deg`, '--pile-size': `${30+(i%4)*8}px` }}><path fill={i%4===0 ? '#f3c45e' : '#ead5aa'} stroke="#896236" strokeWidth="2" d="M16 10C13 1 3 1 3 8C3 12 6 14 7 16C6 18 3 20 3 24C3 31 13 31 16 22C25 20 39 20 48 22C51 31 61 31 61 24C61 20 58 18 57 16C58 14 61 12 61 8C61 1 51 1 48 10C39 12 25 12 16 10Z"/><path stroke="#fff3d2" strokeWidth="2" fill="none" d="M18 13Q32 16 46 13"/></svg>)}</div>
    {['left', 'right'].map(side => <div className={`burn-flight-bank burn-flight-${side}`} key={side} aria-hidden="true">{Array.from({length:5}, (_, i) => <svg className="burn-flight-bone" key={i} style={{ '--bone-n': i, '--bone-turn': `${i*43}deg`, '--bone-spread': `${(i-2)*8}px` }} viewBox="0 0 64 32"><path fill="#ffe2a0" stroke="#b67b31" strokeWidth="2" d="M16 10C13 1 3 1 3 8C3 12 6 14 7 16C6 18 3 20 3 24C3 31 13 31 16 22C25 20 39 20 48 22C51 31 61 31 61 24C61 20 58 18 57 16C58 14 61 12 61 8C61 1 51 1 48 10C39 12 25 12 16 10Z"/><path fill="none" stroke="#fff8de" strokeWidth="2" d="M18 13Q32 16 46 13"/></svg>)}</div>)}
    <div className="burn-steam burn-steam-left" /><div className="burn-steam burn-steam-right" />
    <div className="burn-embers" aria-hidden="true">{Array.from({ length: 22 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div>
    <div className="furnace-machinery" aria-hidden="true">
      {['left','right','far-right'].map(side => <div className={`furnace-instrument furnace-instrument-${side}`} key={side}>
        <div className="furnace-gauge"><svg viewBox="0 0 100 100">
          <defs><linearGradient id={`${gaugeId}-${side}-brass`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff0b2"/><stop offset=".22" stopColor="#d5a34e"/><stop offset=".48" stopColor="#68401f"/><stop offset=".72" stopColor="#efc87b"/><stop offset="1" stopColor="#93602d"/></linearGradient><radialGradient id={`${gaugeId}-${side}-face`} cx=".4" cy=".3" r=".8"><stop stopColor="#f4e5bf"/><stop offset=".7" stopColor="#d8c292"/><stop offset="1" stopColor="#947951"/></radialGradient><linearGradient id={`${gaugeId}-${side}-glass`} x2=".6" y2="1"><stop stopColor="#ffd7fc" stopOpacity=".25"/><stop offset=".4" stopColor="#fff9df" stopOpacity=".03"/><stop offset="1" stopColor="#54ff9b" stopOpacity=".08"/></linearGradient></defs>
          <circle cx="50" cy="50" r="47" fill="#352315" stroke="#170f0b" strokeWidth="2"/>
          <circle cx="50" cy="50" r="44" fill={`url(#${gaugeId}-${side}-brass)`} stroke="#b28547" strokeWidth="1"/>
          <path d="M17 28A40 40 0 0 1 77 20" fill="none" stroke="#ffe5a0" strokeWidth="1.5" opacity=".75"/><path d="M11 44A41 41 0 0 1 22 22" fill="none" stroke="#ee6dd4" strokeWidth="2" opacity=".4"/>
          <circle cx="50" cy="50" r="36.5" fill="#392b1c" stroke="#5e3e23" strokeWidth="2"/>
          <circle cx="50" cy="50" r="33.5" fill={`url(#${gaugeId}-${side}-face)`}/>
          <path d="M24 65A29 29 0 0 1 70 28" fill="none" stroke="#8b744e" strokeWidth="2"/><path d="M70 28A29 29 0 0 1 77 64" fill="none" stroke="#a85132" strokeWidth="2"/>
          {[0,1,2,3,4,5,6,7,8].map(i => <path key={i} d={i%2 ? 'M50 20v3' : 'M50 20v5'} transform={`rotate(${i*27-108} 50 50)`} stroke="#68502f" strokeWidth={i%2 ? '1' : '1.6'}/>)}
          <text x="50" y="72" textAnchor="middle" fontSize="4.5" fill="#80643c" letterSpacing="1">PITTENSOR</text>
          <g className="furnace-gauge-needle"><path d="M50 56V26" stroke="#422619" strokeWidth="3" strokeLinecap="round"/><path d="M50 52V25" stroke="#a34b27" strokeWidth="1.4"/><circle cx="50" cy="50" r="4" fill="#b68843" stroke="#55341d" strokeWidth="1"/></g>
          <circle cx="50" cy="50" r="33" fill={`url(#${gaugeId}-${side}-glass)`}/><path d="M27 37Q38 19 60 26" fill="none" stroke="#fff7dc" strokeWidth="2" strokeLinecap="round" opacity=".35"/>
          {[[50,8],[92,50],[50,92],[8,50]].map(([x,y],i) => <g key={i}><circle cx={x} cy={y} r="2.5" fill="#75502d" stroke="#efc77b" strokeWidth=".6"/><path d={`M${x-1.2} ${y+.8}l2.4-1.6`} stroke="#372316" strokeWidth=".8"/></g>)}
        </svg><small>PRESSURE</small></div>
        <span className="furnace-warning" />
        <FurnaceValve id={`${gaugeId}-${side}`} />
        <div className="furnace-vent">{Array.from({length:6}, (_, i) => <i key={i} style={{'--vent-n':i, '--vent-drift':`${(i%2 ? 1 : -1)*(16+i*5)}px`}} />)}</div>
      </div>)}
    </div>
    {['left','right'].map(side => <div className={`furnace-impact furnace-impact-${side}`} key={side} aria-hidden="true">{Array.from({length:12}, (_, i) => <i key={i} style={{ '--spark-x': `${Math.cos(i * 2.4) * (24+i*3)}px`, '--spark-y': `${-25-(i%5)*15}px`, '--spark-turn': `${i*31}deg` }} />)}<span className="furnace-impact-flash"/></div>)}
    <div className="furnace-impact-reflection" aria-hidden="true" />
    <div className="burn-scene-vignette" />
    <span className="burn-scene-label">{firing ? celebration ? 'BURN CONFIRMED · VERIFIED RECEIPT' : 'FURNACE PREVIEW · NO TOKENS SPENT' : 'THE PACK’S INCINERATOR'}</span>
  </div>;
}
export default function BonezBurner({ address, onConnect, onFireChange, dedicated = false }) {
  const [expanded, setExpanded] = useState(false);
  const [firing, setFiring] = useState(false);
  const [amount, setAmount] = useState('');
  const [review, setReview] = useState(null), [busy, setBusy] = useState(false), [sent, setSent] = useState(null), [settled, setSettled] = useState(false), [burnStatus, setBurnStatus] = useState(''), [celebration, setCelebration] = useState(false);
  const actionLock = useRef(false);
  const blocked = Boolean(sent && !settled);
  useEffect(() => { setReview(null); setSettled(false); setSent(null); setBurnStatus(''); if (address) { try { const pending = pendingBurn(address); if (pending) { setSent(pending); setBurnStatus(pending.hash ? 'Waiting for the previous burn receipt…' : 'Previous submission is uncertain. Check wallet history before another burn.'); } } catch (e) { setSent({address, hash:null}); setBurnStatus(e.message); } } }, [address]);
  useEffect(() => {
    if (!sent?.hash || sent.address !== address) return;
    let active = true, pollTimer;
    async function poll() {
      try {
        const tx = await json(`https://api.multiversx.com/transactions/${sent.hash}`, AbortSignal.timeout(15000));
        if (!active) return;
        if (tx.status === 'success') {
          try { assertBurnReceipt(tx, sent); setBurnStatus('Burn confirmed. These BONEZ have been permanently destroyed.'); setCelebration(true); setFiring(true); clearTimeout(timer.current); timer.current = setTimeout(() => setFiring(false), 6500); setRefresh(n => n + 1); } catch (e) { setBurnStatus(e.message); }
          setSettled(true); return;
        }
        if (['fail','invalid'].includes(tx.status)) { setSettled(true); setBurnStatus('Burn failed. Check its Explorer receipt; network fees may still apply.'); return; }
      } catch { /* Indexing may lag; never retry the transaction itself. */ }
      if (active) pollTimer = setTimeout(poll, 6000);
    }
    void poll(); return () => { active = false; clearTimeout(pollTimer); };
  }, [sent, address]);
  async function reviewBurn() {
    if (actionLock.current || blocked) return; actionLock.current = true; setBusy(true); setBurnStatus('Verifying your burn with the network…'); setReview(null);
    try { setReview(await prepareBurn(amount)); setBurnStatus('Simulation passed. Review the permanent burn below.'); } catch (e) { setBurnStatus(e.message); } finally { actionLock.current = false; setBusy(false); }
  }
  async function confirmBurn() {
    if (actionLock.current || !review || blocked) return; actionLock.current = true; setBusy(true); setBurnStatus('Approve the exact burn amount in your wallet.');
    try { const receipt = await submitBurn(review); setSent(receipt); setSettled(false); setReview(null); setBurnStatus('Submitted. Waiting for on-chain confirmation…'); } catch (e) { setBurnStatus(e.message); try { const pending = pendingBurn(review.address); if (pending) { setSent(pending); setSettled(false); } } catch { setSent({ address: review.address, hash: null }); } setReview(null); } finally { actionLock.current = false; setBusy(false); }
  }
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
    clearTimeout(timer.current); setCelebration(false); setFiring(true);
    timer.current = setTimeout(() => setFiring(false), 6500);
  }
  function changeAmount(value) {
    setAmount(value); setReview(null); setInputError('');
    if (value) {
      try { const atomic = burnAtomic(value); if (balance !== null && atomic > BigInt(balance)) throw Error('That amount exceeds your wallet balance.'); }
      catch (e) { setInputError(e.message); }
    }
  }
  return <section id="bonez-burner" className={`burner ${expanded ? 'burner-open' : ''}`}>
    <div className="burner-header"><div><span className="burn-eyebrow">THE PACK’S INDUSTRIAL QUARTER</span><h2>{dedicated ? "The Furnace Room" : "Pittensor"}</h2><p>Feed the furnace. Fuel the legend.</p></div><span className="burner-status"><i /> FURNACE ONLINE <small>Wallet burn verification required</small></span></div>
    <div className="burner-layout">
      <div className="burner-showcase"><FurnaceScene firing={firing} expanded={expanded} celebration={celebration} /><div className="burn-scene-actions"><button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>{expanded ? 'Close furnace room ↑' : 'Expand the furnace room →'}</button><button type="button" onClick={preview} disabled={firing}>{firing ? 'Furnace firing…' : 'Preview the fire 🔥'}</button></div></div>
      <div className="burn-control"><span className="burn-eyebrow">FURNACE CONTROL</span><h3>You earn, we burn!</h3><p>Real BONEZ. Permanent destruction. Every completed burn will have an on-chain receipt.</p>
        <div className="burn-wallet"><span>Your wallet BONEZ</span><strong>{address ? balance === null ? 'Loading…' : display(bonezHuman(balance)) : 'Connect to view'}</strong><small>Only liquid tokens in your wallet</small></div>
        <label htmlFor="burn-amount">Amount of BONEZ</label><div className="burn-input"><input id="burn-amount" disabled={busy || blocked} type="text" inputMode="decimal" value={amount} onChange={e => changeAmount(e.target.value)} placeholder="e.g. 1000" autoComplete="off" aria-describedby="burn-input-error burn-precision-help burn-route-note" /><span>BONEZ</span></div>
        <p id="burn-precision-help" className="burn-precision-help">Enter the BONEZ amount normally. All 6 decimal places are handled automatically—no extra zeros needed.</p>
        <div className="burn-percent">{[10,25,50].map(n => <button key={n} type="button" disabled={busy || blocked || balance === null || BigInt(balance || '0') === 0n} onClick={() => changeAmount(bonezHuman(BigInt(balance) * BigInt(n) / 100n))}>{n}%</button>)}</div>
        <div id="burn-input-error" role="status" className="burn-error">{inputError}</div>
        {!address ? <button className="burn-main" type="button" onClick={onConnect}>Connect wallet</button> : <button className="burn-main" type="button" disabled={busy || blocked || !amount || Boolean(inputError)} onClick={reviewBurn}>{busy ? "Verifying…" : blocked ? "Waiting for burn receipt" : "Verify and review burn"}</button>}
        <p id="burn-route-note" className="burn-route-note">Burning permanently destroys your BONEZ. Verification spends no tokens and must pass before wallet signing. Previewing the fire is free.</p>
        {review && review.address === address && <div className="burn-review"><strong>Permanently burn {review.amount} BONEZ?</strong><p>From {review.address.slice(0,9)}…{review.address.slice(-6)} · Mainnet</p><p>Maximum network fee: {Number(review.feeCap)/1e18} EGLD</p><p>This cannot be undone. It does not pay staking rewards or return tokens.</p><button className="burn-main" type="button" disabled={busy || blocked} onClick={confirmBurn}>Confirm permanent burn</button><button type="button" disabled={busy} onClick={() => setReview(null)}>Cancel</button></div>}
        {burnStatus && <p className="burn-route-note" role="status">{burnStatus}</p>}
        {sent?.hash && <div className="burn-receipt"><strong>{settled ? 'Burn transaction receipt' : 'Pending burn transaction'}</strong><span>{sent.amount} BONEZ</span><a href={`https://explorer.multiversx.com/transactions/${sent.hash}`} target="_blank" rel="noreferrer">View on-chain receipt ↗</a></div>}
        <a href={`https://explorer.multiversx.com/tokens/${BONEZ_TOKEN}`} target="_blank" rel="noreferrer">Verify BONEZ on Explorer ↗</a>
      </div>
    </div>
    <div className="burn-stats"><div><span>Total BONEZ burned · all time</span><strong>{token ? display(bonezHuman(token.burnt)) : '—'}</strong></div><div><span>Current token supply</span><strong>{token ? display(token.supply) : '—'}</strong></div><div><span>Verified token</span><strong>{BONEZ_TOKEN}</strong><small>6 decimal places · Mainnet</small></div><button type="button" onClick={() => setRefresh(n => n + 1)}>Refresh stats ↻</button></div>
    {error && <p className="burn-error" role="status">{error}</p>}
  </section>;
}
