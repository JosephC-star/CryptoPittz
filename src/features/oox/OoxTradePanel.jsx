import { useEffect, useRef, useState } from 'react';
import { useGetAccount } from '@multiversx/sdk-dapp/out/react/account/useGetAccount';
import { formatAmount } from '@oox-marketplace/sdk';
import { client, prepare, submit } from './trade';
import { readListingItems } from './listingResponse';
import { CONTRACT, validateListing } from './validation';
import './preview.css';
export default function OoxTradePanel({nft,isOwned}) {
  const account=useGetAccount();
  const [listing,setListing]=useState(null),[message,setMessage]=useState('Checking OOX…');
  const [price,setPrice]=useState(''),[days,setDays]=useState(7),[review,setReview]=useState(null),[busy,setBusy]=useState(false),[sent,setSent]=useState(false);
  const lock=useRef(false);
  useEffect(()=>{
    let active=true;
    client.api.getListings({identifiers:[nft.identifier],size:20}).then(page=>{
      if(!active)return;
      const match=readListingItems(page).find(x=>x.priceType==='fixed'&&x.saleType==='nft'&&x.paymentToken==='EGLD');
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
    try{setMessage('Approve the exact transaction in your wallet.');const result=await submit(selected);setSent(true);setMessage(`Submitted to mainnet; settlement is pending. Check your wallet/explorer before retrying. Tracking: ${result.session||'see wallet history'}`);}
    catch(e){setMessage(`Transaction did not complete: ${e.message} If signing or sending began, check wallet history before retrying.`)}finally{lock.current=false;setBusy(false)}
  }
  return <section className="oox-preview" aria-label="OOX owner testing">
    <strong>OOX · Owner testing · Real mainnet transactions</strong>
    <p>Use a limited test wallet. Buying spends EGLD; listing transfers this NFT into the OOX marketplace contract. Network fees apply.</p>
    {!account.address?<p>Connect your test wallet using the site’s Connect Wallet button.</p>:<p>Wallet: {account.address.slice(0,10)}…{account.address.slice(-6)}</p>}
    {listing&&<><p>Buy price: <strong>{formatAmount(listing.price,18)} EGLD</strong></p><button className="btn primary" disabled={!account.address||busy||sent} onClick={()=>run('buy')}>Review buy</button></>}
    {isOwned&&account.address&&<><h3>Sell / List on OOX</h3><label>Fixed price in EGLD<input value={price} disabled={busy||sent} onChange={e=>{setPrice(e.target.value);setReview(null)}} inputMode="decimal" placeholder="0.1"/></label><label>Listing duration<select value={days} disabled={busy||sent} onChange={e=>{setDays(Number(e.target.value));setReview(null)}}><option value={1}>1 day</option><option value={7}>7 days</option><option value={30}>30 days</option></select></label><button className="btn primary" disabled={busy||sent||!price} onClick={()=>run('list')}>Review listing</button></>}
    {review&&review.address===account.address&&<div><h3>Confirm {review.action==='buy'?'purchase':'listing'}</h3><p>{nft.name} · {nft.identifier}</p><p>{review.price} EGLD{review.action==='list'?` · ${review.days} days`:''}</p><p>Maximum network fee allowance: {formatAmount(review.feeCap,18)} EGLD. Marketplace fees and royalties may reduce listing proceeds.</p><p>OOX contract: {CONTRACT}</p><button className="btn primary" disabled={busy} onClick={confirm}>Sign & send {review.action==='buy'?'purchase':'listing'}</button><button className="btn" disabled={busy} onClick={()=>setReview(null)}>Cancel review</button><details><summary>Exact transaction</summary><pre>{JSON.stringify(review.payload,null,2)}</pre></details></div>}
    <p role="status">{message}</p>
  </section>;
}
