import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import './district.css';
const BonezStaking=lazy(()=>import('../bonez-staking/BonezStaking.jsx'));
const BonezLiquidity=lazy(()=>import('../bonez-liquidity/BonezLiquidity.jsx'));
const BonezSwap=lazy(()=>import('../bonez-swap/BonezSwap.jsx'));
const services=[
 {id:'swap',name:'Token Swap',eyebrow:'MOVE WITH THE PACK',description:'Find your next move. Swap BONEZ and 15 more currencies without leaving The PittzStop.',action:'Enter the exchange',status:'Open now'},
 {id:'staking',name:'BONEZ Staking',eyebrow:'PUT YOUR BONEZ TO WORK',description:'Put your BONEZ to work on OneDEX. Stake, claim rewards, and manage your position from the pack’s golden home.',action:'Start staking',status:'Open in preview'},
 {id:'liquidity',name:'Liquidity Pool',eyebrow:'FUEL THE ECOSYSTEM',description:'The next chapter for BONEZ liquidity. Pool access and LP buying, together in one place.',action:'Add liquidity',status:'Open in preview'}
];
function ServiceArt({type}){
 const goldId=useId();
 return <div className={'district-art district-art-'+type} aria-hidden="true">
  <div className="district-orbit"/><div className="district-orbit district-orbit-second"/>
  <div className="district-emblem">
   {type==='liquidity'?<div className="district-pool-artwork">
    <div className="district-pool-artwork-window"><img src="/images/bonez-mvx-liquidity-transparent.png" alt=""/><span className="district-pool-flow"/><span className="district-pool-pulse"/></div>
   </div>:<>
    <svg viewBox="0 0 200 160" fill="none"><defs><linearGradient id={goldId} x2="1" y2="1"><stop stopColor="#fff2bf"/><stop offset=".45" stopColor="#dab15b"/><stop offset="1" stopColor="#7b4d16"/></linearGradient></defs><g stroke={'url(#'+goldId+')'} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">{type==='swap'?<><path d="M47 60C67 23 132 23 153 61M153 61l-4-23m4 23-23-5M153 100C132 137 68 137 47 99M47 99l4 23m-4-23 23 5"/><circle cx="100" cy="80" r="31"/></>:<><rect x="47" y="38" width="106" height="94" rx="16"/><rect x="57" y="48" width="86" height="74" rx="9"/><circle cx="100" cy="85" r="24"/><path d="M37 137h126"/></>}</g></svg>
    <img className="district-emblem-bonez" src="/images/cryptopittz-bonez-transparent.png" alt=""/>
   </>}
  </div>
  <span className="district-art-spark">✦</span>
 </div>;
}
export default function FinancialDistrict(){
 const [selected,setSelected]=useState(null),[busy,setBusy]=useState(false);
 const panel=useRef(null),trigger=useRef(null);
 useEffect(()=>{
  if(!selected)return;
  const previous=document.body.style.overflow;document.body.style.overflow='hidden';
  panel.current?.querySelector('button')?.focus();
  return()=>{document.body.style.overflow=previous;trigger.current?.focus();};
 },[selected]);
 function close(){if(!busy)setSelected(null);}
 function keyboard(e){
  if(e.key==='Escape'&&!busy){e.preventDefault();close();}
  if(e.key!=='Tab'||busy||!panel.current?.contains(document.activeElement))return;
  const nodes=[...panel.current.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(n=>n.getClientRects().length);
  const first=nodes[0],last=nodes.at(-1);
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
 }
 return <div className="financial-district"><header className="district-header"><a href="/" className="district-brand">THE PITTZ<span>STOP</span><small>WELCOME TO THE PACK</small></a><nav aria-label="Financial District navigation"><a href="/?sale=listed&collection=original#explorer">Pittz for sale</a><a href="/">Home ↗</a></nav></header>
 <main className="district-main"><section className="district-hero"><div className="district-bone-rain" aria-hidden="true">{Array.from({length:14},(_,i)=><span className="district-falling-bone" key={i} style={{"--drop-x":((i*37+5)%100)+"%","--drop-delay":(-i*1.63)+"s","--drop-duration":(4.3+(i%5)*.45)+"s","--drop-size":(20+(i%4)*5)+"px","--drop-rotation":(i*47)+"deg","--drop-turn":(i%2?230:-210)+"deg"}}><svg viewBox="0 0 64 32"><defs><linearGradient id={"district-bone-metal-"+i} x1="0" y1="0" x2=".3" y2="1"><stop stopColor="#fff4b8"/><stop offset=".24" stopColor="#ffdf65"/><stop offset=".5" stopColor="#e9ac21"/><stop offset=".72" stopColor="#ffd94f"/><stop offset="1" stopColor="#995b09"/></linearGradient></defs><path fill={"url(#district-bone-metal-"+i+")"} d="M16 10C13 1 3 1 3 8C3 12 6 14 7 16C6 18 3 20 3 24C3 31 13 31 16 22C25 20 39 20 48 22C51 31 61 31 61 24C61 20 58 18 57 16C58 14 61 12 61 8C61 1 51 1 48 10C39 12 25 12 16 10Z"/><path fill="none" stroke="#fff5ce" strokeWidth="1.5" strokeLinecap="round" opacity=".75" d="M17 13C27 15 37 15 47 13M8 6C11 5 12 7 13 9M51 6C54 4 57 6 57 9"/></svg><i>✦</i></span>)}</div><div className="district-kicker"><span/>THE PACK'S GOLDEN QUARTER</div><p className="district-hero-overline">WELCOME TO THE</p><h1>Pittz <em>Financial District</em></h1><p className="district-intro">Your currencies. Your next move. One home for the pack.</p><div className="district-motto">You earn, we burn! <span>✦</span></div></section>
 <section className="district-services" aria-label="Financial services">{services.map(service=><button className="district-service" key={service.id} onClick={e=>{trigger.current=e.currentTarget;setBusy(false);setSelected(service);}} aria-haspopup="dialog"><div className="district-card-top"><span>{service.eyebrow}</span><small className={'district-open'}>{service.status}</small></div><ServiceArt type={service.id}/><div className="district-card-copy"><h2>{service.name}</h2><p>{service.description}</p><div className="district-card-action">{service.action}<span>↗</span></div></div></button>)}</section>
 <div className="district-note"><span>✦</span><p>Built around BONEZ. Connected to MultiversX.<small>Swap, stake, and fuel the pool. Your next move starts here.</small></p></div></main><footer className="district-footer"><span>THE PITTZSTOP · THE PACK'S HOME BASE</span><span>You earn, we burn!</span></footer>
 {selected&&<div className="district-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)close();}} onKeyDown={keyboard}><section ref={panel} className={'district-panel '+'district-swap-panel'} role="dialog" aria-modal="true" aria-labelledby="district-panel-title"><div className="district-panel-heading"><div><span>THE PITTZ FINANCIAL DISTRICT</span><h2 id="district-panel-title">{selected.name}</h2></div><button className="district-close" disabled={busy} onClick={close} aria-label="Close service">×</button></div>{selected.id==='swap'?<Suspense fallback={<p className="district-loading" role="status">Opening the exchange…</p>}><BonezSwap embedded onBusyChange={setBusy}/></Suspense>:selected.id==='liquidity'?<Suspense fallback={<p className="district-loading" role="status">Loading the verified BONEZ pool…</p>}><BonezLiquidity onBusyChange={setBusy}/></Suspense>:<Suspense fallback={<p className="district-loading" role="status">Loading BONEZ staking…</p>}><BonezStaking onBusyChange={setBusy}/></Suspense>}</section></div>}
 </div>;
}
