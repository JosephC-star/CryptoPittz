import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import './district.css';
const BonezSwap=lazy(()=>import('../bonez-swap/BonezSwap.jsx'));
const services=[
 {id:'swap',name:'Token Swap',eyebrow:'MOVE WITH THE PACK',description:'Find your next move. Swap BONEZ and 15 more currencies without leaving The PittzStop.',action:'Enter the exchange',status:'Open now'},
 {id:'staking',name:'BONEZ Staking',eyebrow:'PUT YOUR BONEZ TO WORK',description:'A new home for staking BONEZ. Built for the pack, with every detail clear before you commit.',action:'Explore staking',status:'Coming soon'},
 {id:'liquidity',name:'Liquidity Pools',eyebrow:'FUEL THE ECOSYSTEM',description:'The next chapter for BONEZ liquidity. Pool access and LP buying, together in one place.',action:'Explore liquidity',status:'Coming soon'}
];
function ServiceArt({type}){
 return <div className={'district-art district-art-'+type} aria-hidden="true"><div className="district-orbit"/><svg viewBox="0 0 200 160" fill="none"><defs><linearGradient id={'district-gold-'+type} x2="1" y2="1"><stop stopColor="#fff2bf"/><stop offset=".45" stopColor="#dab15b"/><stop offset="1" stopColor="#7b4d16"/></linearGradient></defs><g stroke={'url(#district-gold-'+type+')'} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">{type==='swap'?<><path d="M47 60C67 23 132 23 153 61M153 61l-4-23m4 23-23-5M153 100C132 137 68 137 47 99M47 99l4 23m-4-23 23 5"/><circle cx="100" cy="80" r="31"/></>:type==='staking'?<><rect x="47" y="38" width="106" height="94" rx="16"/><rect x="57" y="48" width="86" height="74" rx="9"/><circle cx="100" cy="85" r="24"/><path d="M100 61v12m0 24v12M76 85h12m24 0h12M37 137h126"/></>:<><circle cx="72" cy="76" r="36"/><circle cx="128" cy="92" r="36"/><path d="M60 123h80M71 133h59M72 61v30m-8-23h12m-12 16h12M128 77v30m-8-23h12m-12 16h12"/></>}</g></svg>{type==='swap'&&<img src="/images/cryptopittz-bonez-transparent.png" alt=""/>}<span className="district-art-spark">✦</span></div>;
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
 <main className="district-main"><section className="district-hero"><div className="district-kicker"><span/>THE PACK'S GOLDEN QUARTER</div><p className="district-hero-overline">WELCOME TO THE</p><h1>Pittz <em>Financial District</em></h1><p className="district-intro">Your currencies. Your next move. One home for the pack.</p><div className="district-motto">You earn, we burn! <span>✦</span></div></section>
 <section className="district-services" aria-label="Financial services">{services.map(service=><button className="district-service" key={service.id} onClick={e=>{trigger.current=e.currentTarget;setBusy(false);setSelected(service);}} aria-haspopup="dialog"><div className="district-card-top"><span>{service.eyebrow}</span><small className={service.id==='swap'?'district-open':''}>{service.status}</small></div><ServiceArt type={service.id}/><div className="district-card-copy"><h2>{service.name}</h2><p>{service.description}</p><div className="district-card-action">{service.action}<span>↗</span></div></div></button>)}</section>
 <div className="district-note"><span>✦</span><p>Built around BONEZ. Connected to MultiversX.<small>Swap is open. Staking and liquidity services are coming next.</small></p></div></main><footer className="district-footer"><span>THE PITTZSTOP · THE PACK'S HOME BASE</span><span>You earn, we burn!</span></footer>
 {selected&&<div className="district-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)close();}} onKeyDown={keyboard}><section ref={panel} className={'district-panel '+(selected.id==='swap'?'district-swap-panel':'')} role="dialog" aria-modal="true" aria-labelledby="district-panel-title"><div className="district-panel-heading"><div><span>THE PITTZ FINANCIAL DISTRICT</span><h2 id="district-panel-title">{selected.name}</h2></div><button className="district-close" disabled={busy} onClick={close} aria-label="Close service">×</button></div>{selected.id==='swap'?<Suspense fallback={<p className="district-loading" role="status">Opening the exchange…</p>}><BonezSwap embedded onBusyChange={setBusy}/></Suspense>:<div className="district-coming"><ServiceArt type={selected.id}/><span className="district-kicker">COMING SOON</span><h3>{selected.id==='staking'?'A new way to put BONEZ to work.':'Help fuel the BONEZ ecosystem.'}</h3><p>{selected.id==='staking'?'Staking options, terms, and rewards will appear here when this service is ready.':'Pool details, LP pricing, and transaction reviews will appear here when this service is ready.'}</p><p className="district-coming-note">This service is not accepting deposits yet.</p><button className="district-return" onClick={close}>Back to the district →</button></div>}</section></div>}
 </div>;
}
