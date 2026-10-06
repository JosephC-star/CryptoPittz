import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getNftImage } from '../../utils/nftUtils';
import { drawPaperBurn, REVEAL_DURATION } from './paperBurn';
import { shareUrl } from './exportRevealGif';
export default function PurchaseCelebration({ nft, hash }) {
  return <BurnCelebration key={`${nft.identifier}:${hash}`} nft={nft} hash={hash} />;
}
function BurnCelebration({ nft, hash }) {
  const [open,setOpen]=useState(true);
  const dialog=useRef(null),titleId=useId();
  const [reveal,setReveal]=useState('covered'),[origin,setOrigin]=useState({x:0,y:0});
  const [exporting,setExporting]=useState(false),[progress,setProgress]=useState(0),[exportError,setExportError]=useState('');
  const canvas=useRef(null),job=useRef(null),downloadUrl=useRef(null);
  useEffect(()=>{
    const node=dialog.current;
    if(!open){node?.close();return;}
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    node.showModal();
    return()=>{node.close();document.body.style.overflow=previousOverflow;};
  },[open]);
  const dismiss=()=>{if(reveal==='burning')setReveal('revealed');setOpen(false);};
  useEffect(()=>()=>{job.current?.abort();if(downloadUrl.current)URL.revokeObjectURL(downloadUrl.current);},[]);
  useEffect(()=>{
    if(reveal!=='burning')return;
    const node=canvas.current,ctx=node.getContext('2d'),size=node.clientWidth,scale=Math.min(window.devicePixelRatio||1,2);
    node.width=Math.round(size*scale);node.height=Math.round(size*scale);ctx.setTransform(scale,0,0,scale,0,0);
    let raf;const start=performance.now();
    const finish=()=>setReveal('revealed');
    const frame=now=>{const elapsed=now-start;drawPaperBurn(ctx,size,size,Math.min(1,Math.max(0,(elapsed-400)/4800)),elapsed);if(elapsed<REVEAL_DURATION)raf=requestAnimationFrame(frame);else finish();};
    raf=requestAnimationFrame(frame);
    const hidden=()=>{if(document.hidden)finish();};document.addEventListener('visibilitychange',hidden);
    return()=>{cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',hidden);};
  },[reveal]);
  const ignite=event=>{
    const rect=event.currentTarget.getBoundingClientRect();setOrigin({x:rect.left+rect.width*.32,y:rect.top+rect.height*.68});
    setReveal(window.matchMedia('(prefers-reduced-motion: reduce)').matches?'revealed':'burning');
  };
  const download=async()=>{
    if(job.current)return;
    const controller=new AbortController();job.current=controller;setExporting(true);setExportError('');setProgress(0);
    try{
      const {exportRevealGif}=await import('./exportRevealGif');
      const blob=await exportRevealGif(getNftImage(nft),nft.name,controller.signal,setProgress);
      if(controller.signal.aborted)return;
      if(downloadUrl.current)URL.revokeObjectURL(downloadUrl.current);
      downloadUrl.current=URL.createObjectURL(blob);
      const link=document.createElement('a');link.href=downloadUrl.current;link.download=`${(nft.identifier||'pittz').replace(/[^a-z0-9-]/gi,'')}-reveal.gif`;document.body.appendChild(link);link.click();link.remove();
    }catch(error){if(!controller.signal.aborted)setExportError(error.name==='SecurityError'?'The artwork server blocked GIF export. You can still replay your reveal.':'GIF export could not complete. Please try again.');}
    finally{if(!controller.signal.aborted){setExporting(false);job.current=null;}}
  };
  return <>
    {!open&&<button className="btn primary" onClick={()=>setOpen(true)}>View your purchased Pittz ✨</button>}
    {createPortal(<dialog ref={dialog} className="pitt-reveal-dialog" aria-labelledby={titleId} onCancel={event=>{event.preventDefault();event.stopPropagation();dismiss();}} onClick={event=>event.stopPropagation()} onKeyDown={event=>event.stopPropagation()}>
    <div className={`pitt-purchase-party paper-reveal ${reveal}`}>
    <button className="pitt-reveal-close" onClick={dismiss} aria-label="Close purchase reveal" autoFocus>×</button>
    {(reveal==='burning'||reveal==='revealed')&&<div className="pitt-flying-embers" key={reveal} style={{left:origin.x,top:origin.y}} aria-hidden="true">
      {Array.from({length:reveal==='burning'?76:52},(_,i)=><i className={reveal==='revealed'?'finale':''} key={i} style={{'--dx':`${(i*83)%760-380}px`,'--dy':`${-100-(i*47)%530}px`,'--delay':`${reveal==='burning'?(i%14)*.15:0}s`,'--size':`${1.5+i%4*.7}px`}}/>)}
    </div>}
    <p className="pitt-party-eyebrow">WELCOME TO YOUR PACK</p><h3 id={titleId}>You just bought…</h3>
    <div className="pitt-party-frame"><div className={`pitt-burn-art ${reveal}`}>
      <img src={getNftImage(nft)} alt={nft.name}/>
      {reveal!=='revealed'&&<><canvas className="paper-burn-canvas" ref={canvas} aria-hidden="true"/>
        <button className="pitt-burn-cover" onClick={ignite} disabled={reveal==='burning'} aria-label={`Tap to reveal ${nft.name}`}><span className="pitt-burn-motto">YOU EARN,<br/>WE BURN</span><span className="pitt-burn-prompt">Tap to reveal your Pittz</span></button></>}
    </div></div>
    {reveal!=='revealed'&&<button className="pitt-skip-reveal" onClick={()=>setReveal('revealed')}>Skip reveal</button>}
    <h4>{nft.name}</h4><p aria-live="polite">{reveal==='revealed'?'WELCOME TO YOUR PACK 🐾':'Purchase confirmed. Tap to meet your new pack member.'}</p>
    <div className="pitt-reveal-actions">
      <button className="btn" onClick={()=>setReveal('covered')} disabled={reveal==='burning'}>Replay reveal ↻</button>
      <button className="btn" onClick={download} disabled={exporting}>{exporting?`Creating GIF… ${progress}%`:'Download GIF'}</button>
      <a className="btn" href={shareUrl(nft.name)} target="_blank" rel="noopener noreferrer">Share to X ↗</a>
    </div>
    <p className="pitt-share-note">Download your GIF, then attach it to your X post. No wallet address or purchase price is included.</p>
    {exportError&&<p role="status">{exportError}</p>}
    <a className="btn primary" href={`https://explorer.multiversx.com/transactions/${hash}`} target="_blank" rel="noopener noreferrer">View confirmed purchase ↗</a>
  </div>
  </dialog>,document.body)}
  </>;
}
