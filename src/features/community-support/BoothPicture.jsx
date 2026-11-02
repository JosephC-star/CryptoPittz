import {useEffect,useRef,useState} from 'react';

export default function BoothPicture({booth}) {
 const dialog=useRef(null),[open,setOpen]=useState(false),[zoom,setZoom]=useState(false);
 const src=booth.image_url?booth.image_url+'&v='+encodeURIComponent(booth.updated_at):'/images/cryptopittz-bonez-transparent.png';
 useEffect(()=>{
  if(!open)return;
  const previous=document.body.style.overflow;
  document.body.style.overflow='hidden';
  return()=>{document.body.style.overflow=previous;};
 },[open]);
 return <><button type="button" className={'support-art support-art-button'+(booth.image_url?' support-art-photo':'')} aria-label={'Enlarge picture for '+booth.title} aria-haspopup="dialog" onClick={()=>{setZoom(false);dialog.current.showModal();setOpen(true);}}><img src={src} alt={booth.title} loading="lazy"/><span>BACK BOOTH / 0{booth.id}</span><small>Tap to enlarge ↗</small></button>
 <dialog ref={dialog} className="support-photo-dialog" aria-label={booth.title+' enlarged picture'} onClose={()=>{setOpen(false);setZoom(false);}} onClick={event=>{if(event.target===event.currentTarget)dialog.current.close();}}><div className="support-photo-heading"><h2>{booth.title}</h2><button type="button" autoFocus aria-label="Close enlarged picture" onClick={()=>dialog.current.close()}>×</button></div><div className="support-photo-tools"><button type="button" aria-pressed={zoom} onClick={()=>setZoom(value=>!value)}>{zoom?'Fit picture':'Zoom in'}</button><a href={src} target="_blank" rel="noopener noreferrer">Open original ↗</a></div><p>{zoom?'Scroll sideways or down to read the picture up close.':'Zoom in to read small details.'}</p><div className={'support-photo-view'+(zoom?' is-zoomed':'')}><img src={src} alt={booth.title}/></div></dialog></>;
}
