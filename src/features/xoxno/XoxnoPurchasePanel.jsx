import {useEffect,useRef,useState} from 'react';
import {useGetAccount} from '@multiversx/sdk-dapp/out/react/account/useGetAccount';
import {fetchListing,json,prepare,submit} from './trade.js';
import {validateListing} from './validation.js';
import PurchaseCelebration from '../oox/PurchaseCelebration';
import {purchaseConfirmed} from '../oox/purchaseConfirmation';
import '../oox/preview.css';
import { compactNftPrice } from '../../utils/nftPrice';
function amount(raw){const n=BigInt(raw),whole=n/10n**18n,fraction=(n%10n**18n).toString().padStart(18,'0').replace(/0+$/,'');return whole.toString()+(fraction?'.'+fraction:'');}
export default function XoxnoPurchasePanel({nft,onAvailabilityChanged}){
 const account=useGetAccount(),lock=useRef(false);
 const [listing,setListing]=useState(null),[review,setReview]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[purchase,setPurchase]=useState(null),[confirmed,setConfirmed]=useState(false),[submitted,setSubmitted]=useState(false),[refresh,setRefresh]=useState(0),[checkAttempt,setCheckAttempt]=useState(0),[known,setKnown]=useState(false);
 useEffect(()=>{
  let active=true;setListing(null);setReview(null);
  fetchListing(nft).then(data=>{
   if(!active)return;
   if(data.saleInfo?.marketplace!=='xoxno'){setKnown(false);return;}
   setKnown(true);
   try{setListing(validateListing(data,nft));setMessage('Fixed-price EGLD listing available on XOXNO.');}catch(e){setMessage(e.message);}
  }).catch(e=>{if(active)setMessage(e.message);});
  return()=>{active=false;};
 },[nft,refresh]);
 useEffect(()=>{setReview(null);},[account.address]);
 useEffect(()=>{
  if(!purchase?.hash)return;
  let active=true,timer,attempt=0;
  async function check(){
   try{
    const tx=await json(`https://api.multiversx.com/transactions/${purchase.hash}`);if(!active)return;
    if(['fail','invalid'].includes(tx.status)){setMessage('Purchase failed on-chain. Check the transaction for details.');return;}
    if(tx.status==='success'){
     const owned=await json(`https://api.multiversx.com/accounts/${purchase.address}/nfts/${nft.identifier}`);if(!active)return;
     if(purchaseConfirmed(tx,owned,purchase.expected,nft.identifier)){setConfirmed(true);setMessage('Purchase confirmed! Welcome to your pack.');return;}
    }
   }catch{/* Indexing can lag. Never repeat a purchase to check its status. */}
   if(active&&++attempt<40)timer=setTimeout(check,3000);
   else if(active)setMessage('Confirmation is pending. Check your transaction or check status again; do not repurchase.');
  }
  check();return()=>{active=false;clearTimeout(timer);};
 },[purchase,nft,checkAttempt]);
 async function reviewPurchase(){
  if(lock.current)return;lock.current=true;setBusy(true);setReview(null);setMessage('Verifying the on-chain auction and simulating your purchase…');
  try{const r=await prepare(nft);setReview(r);setListing(r.listing);setMessage('Review the exact price below. Nothing has been signed or sent.');}catch(e){setMessage(e.message);}finally{lock.current=false;setBusy(false);}
 }
 async function confirm(){
  if(lock.current||!review)return;lock.current=true;setBusy(true);const selected=review;setReview(null);
  try{
   setMessage('Approve the purchase in your wallet. Open xPortal manually if needed.');
   const result=await submit(selected);setSubmitted(true);
   if(result.hash)setPurchase({...result,address:selected.address});
   setMessage('Purchase submitted. Waiting for confirmation; check wallet history before retrying.');
  }catch(e){
   if(e.message.startsWith('Submission status is uncertain'))setSubmitted(true);
   setMessage(e.message+' If signing or sending began, check wallet history before retrying.');
  }finally{lock.current=false;setBusy(false);}
 }
 const canBuy=Boolean(listing)&&listing.seller!==account.address;
 useEffect(()=>{onAvailabilityChanged?.(canBuy);},[canBuy,onAvailabilityChanged]);
 if(!known&&!purchase&&!submitted)return null;
 return <section className="oox-preview pitt-trade-panel" aria-label="XOXNO purchase">
  {confirmed&&purchase&&<PurchaseCelebration nft={nft} hash={purchase.hash}/>}
  <div className="oox-purchase-heading"><div className="pitt-trade-badges"><span className="pitt-sale-tag">{confirmed?'YOUR PITT':'FOR SALE'}</span><span className="pitt-marketplace-tag" aria-label="Marketplace: XOXNO">XOXNO</span></div><span className="oox-market-label">🐾 THE PITTZSTOP</span><h3>Bring this Pittz home</h3></div>
  <p className="pitt-trade-note">Buy this XOXNO listing here. Review the price and network fee, then approve in your wallet.</p>
  {listing&&<p className="oox-price"><strong title={`${amount(listing.price)} EGLD`}>{compactNftPrice(listing.price,true)} EGLD</strong></p>}
  {!account.address&&<p>Connect your wallet using the site’s Connect Wallet button.</p>}
  {listing?.seller===account.address&&<p>This is your XOXNO listing.</p>}
  {canBuy&&!submitted&&<button className="btn primary" disabled={!account.address||busy} onClick={reviewPurchase}>🐾 Review XOXNO purchase →</button>}
  {review&&review.address===account.address&&<div className="swap-review"><h3>Confirm purchase</h3><p>{nft.name} · {nft.identifier}</p><p>Price: <strong>{amount(review.spec.value)} EGLD</strong></p><p>Maximum network fee allowance: <strong>{amount(review.feeCap)} EGLD</strong>. Your wallet shows the exact transaction.</p><p>Marketplace: XOXNO · MultiversX mainnet</p><button className="btn primary" disabled={busy} onClick={confirm}>Sign &amp; send purchase</button><button className="btn" disabled={busy} onClick={()=>setReview(null)}>Cancel review</button></div>}
  <p role="status" aria-live="polite">{message}</p>
  {!submitted&&<button className="btn" disabled={busy} onClick={()=>setRefresh(x=>x+1)}>Refresh XOXNO listing</button>}
  {purchase&&!confirmed&&<><a href={`https://explorer.multiversx.com/transactions/${purchase.hash}`} target="_blank" rel="noreferrer">View transaction ↗</a><button className="btn" onClick={()=>setCheckAttempt(x=>x+1)}>Check purchase status</button></>}
 </section>;
}
