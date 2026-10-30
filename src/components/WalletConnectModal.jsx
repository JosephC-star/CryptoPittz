import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {getAccountProvider} from '@multiversx/sdk-dapp/out/providers/helpers/accountProvider';
import {WalletConnectStateManager} from '@multiversx/sdk-dapp/out/managers/internal/WalletConnectStateManager/WalletConnectStateManager';
import './WalletConnectModal.css';
export default function WalletConnectModal({open,anchorRef,onClose}){
 const dialog=useRef(null);
 const [walletLink,setWalletLink]=useState('');
 useEffect(()=>{
  setWalletLink('');if(!open)return;
  // Use the SDK's active pairing link, including its freshly generated URI.
  const update=()=>setWalletLink(WalletConnectStateManager.getInstance().walletConnectData.walletConnectDeepLink||'');
  update();const timer=setInterval(update,300);return()=>clearInterval(timer);
 },[open]);
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
 return createPortal(<dialog ref={dialog} className="pittz-wallet-modal" aria-label="Connect with xPortal" onCancel={event=>{event.preventDefault();event.stopPropagation();close();}} onKeyDown={event=>{if(event.key==='Escape')event.stopPropagation();}}><div className="pittz-wallet-modal-heading"><h2>Connect with xPortal</h2><button type="button" aria-label="Close wallet connection" onClick={close}>×</button></div><p>On this phone, tap Open xPortal and approve the connection. Then return to this browser tab. Using another device? Scan the QR code below.</p>{walletLink&&<a className="pittz-open-wallet" href={walletLink}>Open xPortal on this phone →</a>}<div ref={anchorRef} className="pittz-wallet-modal-anchor"/><p>If the app does not open, visit this same page in xPortal’s built-in browser. Keep the page open while approving your sign-in.</p></dialog>,document.body);
}
