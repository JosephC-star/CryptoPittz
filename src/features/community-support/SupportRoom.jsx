import BoothPicture from './BoothPicture';
import {useEffect,useRef,useState} from 'react';
import {useGetAccount} from '@multiversx/sdk-dapp/out/react/account/useGetAccount';
import SupportHistory from './SupportHistory';
import BonezSwap from '../bonez-swap/BonezSwap';
import SupporterBoard from './SupporterBoard';
import {signMerchantMessage} from '../../utils/signMerchantMessage';
import {saveSupportReceipt} from './receipt-flow.mjs';
import './support-room.css';
async function api(route,body){const r=await fetch('/.netlify/functions/market-support?route='+route,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Object.assign(Error(data.error||'Please try again.'),{status:r.status});return data;}
const short=a=>a.slice(0,10)+'…'+a.slice(-6);
const pendingKey='pittz-support-receipts-v1';
function readPending(){try{return JSON.parse(localStorage.getItem(pendingKey)||'[]').filter(r=>/^[a-f0-9]{64}$/.test(r.hash)&&[1,2].includes(r.booth)&&typeof r.address==='string').slice(-30);}catch{return [];}}
function Booth({booth,admin,onBuy,onRefresh,refreshTick=0}){
 const [rows,setRows]=useState([]),[offset,setOffset]=useState(0),[more,setMore]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[tick,setTick]=useState(0),[clear,setClear]=useState(false);
 const [title,setTitle]=useState(booth.title),[description,setDescription]=useState(booth.description);
 useEffect(()=>{let live=true;api('board&booth='+booth.id+'&offset='+offset).then(d=>{if(live){setRows(d.supporters);setMore(d.hasMore);}}).catch(e=>{if(live)setMessage(e.message);});return()=>{live=false;};},[booth.id,offset,tick,booth.updated_at,refreshTick]);
 async function action(route,body){if(busy)return;setBusy(true);setMessage('');try{await api(route,{booth:booth.id,...body});setMessage(route==='clear'?'Board cleared. Purchase receipts are preserved.':'Booth updated.');setClear(false);setOffset(0);setTick(n=>n+1);onRefresh();}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 async function photo(file){if(!file)return;if(file.size>2097152){setMessage('Choose a picture under 2 MB.');return;}try{const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});await action('photo',{data,type:file.type});}catch{setMessage('Picture could not be opened.');}}
 return <article className={'support-booth support-booth-'+booth.id}>
  <BoothPicture booth={booth}/>
  <div className="support-booth-body"><h2>{booth.title}</h2><p className="support-copy">{booth.description}</p>{!admin&&<button className="support-primary" onClick={event=>onBuy(booth,event.currentTarget)} aria-haspopup="dialog">Buy BONEZ ↗</button>}
  <SupporterBoard rows={rows} offset={offset}/><div className="support-pagination"><button disabled={offset===0} onClick={()=>setOffset(n=>Math.max(0,n-50))}>← Previous</button><button disabled={!more} onClick={()=>setOffset(n=>n+50)}>Next →</button>{admin&&<button disabled={busy} onClick={()=>setTick(n=>n+1)}>Refresh board</button>}</div>
  {admin&&<details className="support-editor" open><summary>Edit booth & board</summary><form onSubmit={e=>{e.preventDefault();action('edit',{title,description});}}><label>Booth title<input required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>A little text<textarea maxLength={1500} value={description} onChange={e=>setDescription(e.target.value)}/></label><button disabled={busy}>Save text</button></form><label>Change picture · JPG, PNG or WebP, up to 2 MB<input disabled={busy} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>photo(e.target.files[0])}/></label><button disabled={busy} onClick={()=>setClear(true)}>Clear board…</button>{clear&&<div className="support-clear"><p>Clear the public names for {booth.title}? Existing purchase receipts stay saved. Only new purchases after this reset appear here.</p><button disabled={busy} onClick={()=>action('clear',{confirm:true})}>Confirm clear board</button><button disabled={busy} onClick={()=>setClear(false)}>Cancel</button></div>}</details>}
  <p role="status">{message}</p></div></article>;
}
export default function SupportRoom(){
 const panel=useRef(null),trigger=useRef(null),recording=useRef(false);
 const account=useGetAccount();const [booths,setBooths]=useState([]),[chosen,setChosen]=useState(null),[pending,setPending]=useState(readPending),[visible,setVisible]=useState(true),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[swapBusy,setSwapBusy]=useState(false),[tick,setTick]=useState(0);
 useEffect(()=>{let live=true;api('booths').then(d=>{if(live)setBooths(d.booths);}).catch(e=>{if(live)setMessage(e.message);});return()=>{live=false;};},[tick]);
 useEffect(()=>{
  if(!chosen)return;
  const previous=document.body.style.overflow;document.body.style.overflow='hidden';
  panel.current?.querySelector('button')?.focus();
  return()=>{document.body.style.overflow=previous;trigger.current?.focus({preventScroll:true});};
 },[chosen]);
 function closeBuyer(){if(!swapBusy&&!busy)setChosen(null);}
 function buyerKeys(event){
  if(event.defaultPrevented||document.querySelector('dialog[open]'))return;
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeBuyer();return;}
  if(event.key!=='Tab'||swapBusy||!panel.current?.contains(document.activeElement))return;
  const nodes=[...panel.current.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(n=>n.getClientRects().length);
  const first=nodes[0],last=nodes.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 }
 function remember(receipt){const saved={...receipt,booth:chosen.id,visible};const next=[...readPending().filter(r=>r.hash!==receipt.hash),saved].slice(-30);setPending(next);try{localStorage.setItem(pendingKey,JSON.stringify(next));}catch{setMessage('Save your transaction hash so you can record the receipt later.');}}
 async function record(receipt){
  if(recording.current)return;
  recording.current=true;setBusy(true);setMessage('Purchase confirmed. Approve the free receipt message in your wallet to finish your scoreboard entry. This is not another payment.');
  try{
   if(account.address!==receipt.address)throw Error('Connect the wallet that made this purchase.');
   const result=await saveSupportReceipt({receipt,origin:window.location.origin,visible,sign:signMerchantMessage,save:body=>api('record',body)});
   const next=pending.filter(r=>r.hash!==receipt.hash);setPending(next);
   try{localStorage.setItem(pendingKey,JSON.stringify(next));}catch{/* The verified server receipt is already saved. */}
   setMessage(result.visible?'You’re on the board! Your confirmed purchase is saved and the scoreboard is refreshing.':'Receipt saved privately. Thank you for supporting the pack!');setTick(n=>n+1);
  }catch(e){setMessage(e.message+' Your BONEZ purchase is separate and has not been repeated. Use the saved receipt below to retry.');}
  finally{recording.current=false;setBusy(false);}
 }
 function confirmed(receipt){const saved=pending.find(r=>r.hash===receipt.hash)||readPending().find(r=>r.hash===receipt.hash)||{...receipt,booth:chosen.id,visible};return record(saved);}
 function receiptList(rows){return rows.length>0&&<section className="support-receipts"><h2>Finish your scoreboard entry</h2><p>Your purchase is already submitted. Once it confirms, approve one free receipt message. Retrying this step never buys more BONEZ.</p>{rows.map(r=><article key={r.hash}><strong>Booth {r.booth} · {short(r.address)}</strong><a href={'https://explorer.multiversx.com/transactions/'+r.hash} target="_blank" rel="noreferrer">View transaction ↗</a><label><input type="checkbox" checked={typeof r.visible==='boolean'?r.visible:visible} disabled={busy||swapBusy} onChange={event=>{const next=pending.map(p=>p.hash===r.hash?{...p,visible:event.target.checked}:p);setPending(next);try{localStorage.setItem(pendingKey,JSON.stringify(next));}catch{}}}/> Show my herotag or shortened ERD and purchase totals on this booth’s public scoreboard.</label><button disabled={busy||swapBusy||account.address!==r.address} onClick={()=>record(r)}>{busy?'Saving receipt…':(typeof r.visible==='boolean'?r.visible:visible)?'Add confirmed purchase to scoreboard':'Save private purchase receipt'}</button></article>)}{!account.address&&<p>Connect the wallet that made the purchase using the booth’s buyer.</p>}</section>;}
 return <div className="support-room"><div inert={chosen?true:undefined}><header><a href="/flea-market/">← Pittz Flea Market</a><a href="/market-admin?return=back-booths">Admin sign-in ↗</a></header><main><section className="support-hero"><small>PITTZ FLEA MARKET / AFTER DARK</small><h1>Welcome to<br/><em>the back booths.</em></h1><p>Two booths. One community. Pick a corner, buy BONEZ for your wallet, and leave a little love on the supporter wall.</p><span>BONEZ ONLY · YOUR WALLET · YOUR CHOICE</span></section>{window.location.hostname.includes('deploy-preview-')&&<p className="support-preview">Preview boards are separate. Wallet purchases use real mainnet tokens.</p>}<p role="status">{message}</p>{!booths.length?<button onClick={()=>setTick(n=>n+1)}>Load support booths</button>:<div className="support-booths">{booths.map(b=><Booth key={b.id} booth={b} admin={false} refreshTick={tick} onRefresh={()=>setTick(n=>n+1)} onBuy={(b,button)=>{if(swapBusy)return;trigger.current=button;setChosen(b);}}/>)}</div>}

 {receiptList(pending)}

 <footer>From the pack. For the pack. 🐾<a href="/flea-market/">Back to the market →</a></footer></main></div>
 {chosen&&<div className="support-buyer-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)closeBuyer();}} onKeyDown={buyerKeys}><section ref={panel} className="support-buyer support-buyer-popup" role="dialog" aria-modal="true" aria-labelledby="support-buyer-title"><div className="support-popup-heading"><div><small>BACK BOOTH / 0{chosen.id}</small><h2 id="support-buyer-title">Buy BONEZ</h2><p>{chosen.title}</p></div><button className="support-popup-close" disabled={swapBusy||busy} onClick={closeBuyer} aria-label="Close BONEZ buyer">×</button></div><div className="support-board-choice"><label><input type="checkbox" checked={visible} disabled={swapBusy||busy} onChange={event=>setVisible(event.target.checked)}/> Show my herotag or shortened ERD and purchase totals on this booth’s scoreboard.</label><p>After your purchase confirms, we’ll ask your wallet to approve a free receipt message, then update the board. No second payment.</p></div><div inert={busy?true:undefined}><BonezSwap key={chosen.id} embedded purchaseOnly purchaseBooth={chosen.id} onBusyChange={setSwapBusy} onSubmitted={remember} onConfirmed={confirmed}/></div><p className="support-receipt-status" role="status" aria-live="polite">{message}</p>{receiptList(pending.filter(r=>r.booth===chosen.id))}{swapBusy&&<p className="support-popup-note" role="status">Keep this window open while your wallet or transaction is processing.</p>}<button className="support-back-to-booths" disabled={swapBusy||busy} onClick={closeBuyer}>← Back to the booths</button></section></div>}
 </div>;
}

// Mounted only inside the server-verified Market Admin section.
export function SupportBoothAdmin(){
 const [booths,setBooths]=useState([]),[message,setMessage]=useState(''),[tick,setTick]=useState(0);
 useEffect(()=>{let live=true;setMessage('Loading booth settings…');api('booths').then(d=>{if(live){setBooths(d.booths);setMessage('');}}).catch(e=>{if(live)setMessage(e.message);});return()=>{live=false};},[tick]);
 return <section className="support-room support-admin-panel" aria-label="Back Booth management"><h2>Manage the Back Booths.</h2><p>Edit each booth’s picture and text, refresh or clear its public board, and search saved purchase records below.</p><p role="status">{message}</p><div className="support-booths">{booths.map(b=><Booth key={b.id} booth={b} admin onRefresh={()=>setTick(n=>n+1)}/>)}</div><SupportHistory/></section>;
}
