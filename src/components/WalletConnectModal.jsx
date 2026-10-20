import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {getAccountProvider} from '@multiversx/sdk-dapp/out/providers/helpers/accountProvider';
import './WalletConnectModal.css';
export default function WalletConnectModal({open,anchorRef,onClose}){
 const dialog=useRef(null);
 function close(){
  try{Promise.resolve(getAccountProvider().cancelLogin()).catch(()=>{});}catch{}
  anchorRef.current?.replaceChildren();
  onClose();
 }
 useEffect(()=>{
  const node=dialog.current;if(!open){if(node.open)node.close();return;}
  const previous=document.body.style.overflow;document.body.style.overflow='hidden';
  if(!node.open)node.showModal();
  return()=>{if(node.open)node.close();document.body.style.overflow=previous;};
 },[open]);
 return createPortal(<dialog ref={dialog} className="pittz-wallet-modal" aria-label="Connect with xPortal" onCancel={event=>{event.preventDefault();event.stopPropagation();close();}} onKeyDown={event=>{if(event.key==='Escape')event.stopPropagation();}}><div className="pittz-wallet-modal-heading"><h2>Connect with xPortal</h2><button type="button" aria-label="Close wallet connection" onClick={close}>×</button></div><p>Choose xPortal below. If your phone doesn’t open the app, open xPortal manually to finish connecting.</p><div ref={anchorRef} className="pittz-wallet-modal-anchor"/></dialog>,document.body);
}
