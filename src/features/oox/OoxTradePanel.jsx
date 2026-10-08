import { useEffect, useRef, useState } from 'react';
import { useGetAccount } from '@multiversx/sdk-dapp/out/react/account/useGetAccount';
import { formatAmount } from '@oox-marketplace/sdk';
import { client, json, prepare, submit } from './trade';
import { readListingItems } from './listingResponse';
import { CONTRACT, validateListing } from './validation';
import './preview.css';
import { compactNftPrice } from '../../utils/nftPrice';
import PurchaseCelebration from './PurchaseCelebration';
import { purchaseConfirmed } from './purchaseConfirmation';
export default function OoxTradePanel({nft,isOwned,onAvailabilityChanged}) {
  const account=useGetAccount();
  const [listing,setListing]=useState(null),[message,setMessage]=useState('Checking OOX…');
  const [price,setPrice]=useState(''),[days,setDays]=useState(7),[review,setReview]=useState(null),[busy,setBusy]=useState(false),[sent,setSent]=useState(false);
  const lock=useRef(false);
  const [purchase,setPurchase]=useState(null),[confirmed,setConfirmed]=useState(false),[checkAttempt,setCheckAttempt]=useState(0);
  useEffect(()=>{
    if(!purchase)return;
    let active=true,timer,attempt=0;
    async function check(){
      try{
        const tx=await json(`https://api.multiversx.com/transactions/${purchase.hash}`);
        if(!active)return;
        if(['fail','invalid'].includes(tx.status)){setMessage('Purchase failed on-chain. Check the transaction for details.');return;}
        if(tx.status==='success'){
          const owned=await json(`https://api.multiversx.com/accounts/${purchase.address}/nfts/${purchase.identifier}`);
          if(!active)return;
          if(purchaseConfirmed(tx,owned,purchase.expected,purchase.identifier)){setConfirmed(true);setMessage('Purchase confirmed!');return;}
        }
      }catch{ /* Indexing may lag. Keep pending and never resend. */ }
      if(!active)return;
      if(++attempt<40)timer=setTimeout(check,3000);
      else setMessage('Confirmation is still pending. Check the transaction or check status again; do not repurchase.');
    }
    check();return()=>{active=false;clearTimeout(timer)};
  },[purchase,checkAttempt]);
  useEffect(()=>{
    let active=true;
    client.api.getListings({identifiers:[nft.identifier],size:20}).then(page=>{
      if(!active)return;
      const match=readListingItems(page).find(x=>x.identifier===nft.identifier&&x.isActive&&x.priceType==='fixed'&&x.saleType==='nft'&&x.paymentToken==='EGLD'&&x.startTime<=Date.now()/1000&&x.deadline>Date.now()/1000);
      if(match){validateListing(match,nft);setListing(match);setMessage('Fixed-price EGLD listing available.');}
      else setMessage('No supported listing returned by OOX purchase API. Check the marketplace if the sale badge disagrees.');
    }).catch(e=>{if(active)setMessage(e.message)});
    return ()=>{active=false};
  },[nft]);
  async function run(action){
    if(lock.current)return;lock.current=true;setBusy(true);setReview(null);
    try{const next=await prepare(action,nft,listing,price,days);setReview({...next,action,price:action==='buy'?formatAmount(next.payload.value,18):price,days});setMessage('Review below. Nothing has been signed or sent.');}
    catch(e){setMessage(e.message)}finally{lock.current=false;setBusy(false)}
  }
  async function confirm(){
    if(lock.current)return;lock.current=true;setBusy(true);
    const selected=review;setReview(null);
    try{setMessage('Approve the exact transaction in your wallet.');const result=await submit(selected);setSent(true);if(selected.action==='buy'){const hash=result.sent?.[0]?.hash;if(/^[a-f0-9]{64}$/i.test(hash||''))setPurchase({hash,address:selected.address,identifier:selected.nft.identifier,expected:selected.expected,nft:selected.nft});}setMessage(`Submitted to mainnet; settlement is pending. Check your wallet/explorer before retrying. Tracking: ${result.session||'see wallet history'}`);}
    catch(e){setMessage(`Transaction did not complete: ${e.message} If signing or sending began, check wallet history before retrying.`)}finally{lock.current=false;setBusy(false)}
  }
  const canBuy=Boolean(listing)&&listing.seller!==account.address&&!isOwned;
  useEffect(()=>{onAvailabilityChanged?.(canBuy);},[canBuy,onAvailabilityChanged]);
  const canList=Boolean(isOwned&&account.address);
  if(!canBuy&&!canList&&!purchase&&!sent)return null;
  return <section className="oox-preview pitt-trade-panel" aria-label="OOX purchase">
    {confirmed&&purchase&&<PurchaseCelebration nft={purchase.nft} hash={purchase.hash}/>}
    <div className="oox-purchase-heading"><div className="pitt-trade-badges"><span className="pitt-sale-tag">{canBuy?"FOR SALE":"YOUR PITT"}</span><span className="pitt-marketplace-tag" aria-label="Marketplace: OOX">OOX</span></div><span className="oox-market-label">🐾 PITTZSTOP</span><h3>{canBuy?"Bring this Pittz home":"Find this Pittz a new pack"}</h3></div>
    <p className="pitt-trade-note">{canBuy?"Review the price and network fee before approving in your wallet.":"Listing transfers this Pitt into the OOX marketplace contract. Network fees apply."}</p>
    {!account.address?<p>Connect your wallet using the site’s Connect Wallet button.</p>:<p>Wallet: {account.address.slice(0,10)}…{account.address.slice(-6)}</p>}
    {canBuy&&<><p className="oox-price"><strong title={`${formatAmount(listing.price,18)} EGLD`}>{compactNftPrice(listing.price,true)} EGLD</strong></p><button className="btn primary" disabled={!account.address||busy||sent} onClick={()=>run('buy')}>🐾 Review purchase →</button></>}
    {canList&&<><h3>Sell / List on OOX</h3><label>Fixed price in EGLD<input value={price} disabled={busy||sent} onChange={e=>{setPrice(e.target.value);setReview(null)}} inputMode="decimal" placeholder="0.1"/></label><label>Listing duration<select value={days} disabled={busy||sent} onChange={e=>{setDays(Number(e.target.value));setReview(null)}}><option value={1}>1 day</option><option value={7}>7 days</option><option value={30}>30 days</option></select></label><button className="btn primary" disabled={busy||sent||!price} onClick={()=>run('list')}>Review listing</button></>}
    {review&&review.address===account.address&&<div><h3>Confirm {review.action==='buy'?'purchase':'listing'}</h3><p>{nft.name} · {nft.identifier}</p><p>{review.price} EGLD{review.action==='list'?` · ${review.days} days`:''}</p><p>Maximum network fee allowance: {formatAmount(review.feeCap,18)} EGLD. Marketplace fees and royalties may reduce listing proceeds.</p><p>OOX contract: {CONTRACT}</p><button className="btn primary" disabled={busy} onClick={confirm}>Sign & send {review.action==='buy'?'purchase':'listing'}</button><button className="btn" disabled={busy} onClick={()=>setReview(null)}>Cancel review</button><details><summary>Exact transaction</summary><pre>{JSON.stringify(review.payload,null,2)}</pre></details></div>}
    <p role="status">{message}</p>
    {purchase&&!confirmed&&<><a href={`https://explorer.multiversx.com/transactions/${purchase.hash}`} target="_blank" rel="noopener noreferrer">View transaction ↗</a><button className="btn" onClick={()=>setCheckAttempt(x=>x+1)}>Check purchase status</button></>}
  </section>;
}
