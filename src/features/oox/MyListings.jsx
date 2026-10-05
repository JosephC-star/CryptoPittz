import { useEffect, useState } from 'react';
import { formatAmount } from '@oox-marketplace/sdk';
import { client, json } from './trade';
import { readListingItems } from './listingResponse';
import { getNftImage, getNftMarketplace } from '../../utils/nftUtils';
import './preview.css';
const PAGE_SIZE=12;
export default function MyListings({address}) {
  const [page,setPage]=useState(0),[refresh,setRefresh]=useState(0),[result,setResult]=useState(null);
  useEffect(()=>{
    let active=true;
    if(!address)return;
    async function load(){
      try{
        const response=await client.api.getListings({seller:address,from:page*PAGE_SIZE,size:PAGE_SIZE});
        const all=readListingItems(response);
        if(all.some(x=>x.seller!==address))throw Error('Marketplace returned listings for a different wallet.');
        const rows=await Promise.all(all.filter(x=>['PITTZ-1a4c2d','PITTZVICE-c3ec94'].includes(x.collection)).map(async listing=>{
          let nft=null;try{const candidate=await json(`https://api.multiversx.com/nfts/${listing.identifier}`);if(candidate.identifier===listing.identifier)nft=candidate;}catch{ /* Keep listing visible when artwork lookup fails. */ }
          return {listing,nft,active:listing.isActive&&listing.deadline>Date.now()/1000};
        }));
        if(active)setResult({address,page,refresh,rows,total:response.total});
      }catch(e){if(active)setResult({address,page,refresh,error:e.message});}
    }
    load();return()=>{active=false};
  },[address,page,refresh]);
  const current=result?.address===address&&result.page===page&&result.refresh===refresh?result:null;
  return <div className="oox-listings">
    <div className="oox-listings-heading"><div><h3>Your Pittz on OOX</h3><p>Listed Pittz can be held by the marketplace contract, so they appear here separately from your wallet.</p></div><button className="btn" onClick={()=>setRefresh(x=>x+1)}>Refresh listings</button></div>
    {!address?<p>Connect your wallet to see your listings.</p>:!current?<p role="status">Looking up your OOX listings…</p>:current.error?<p role="alert">Could not load listings: {current.error}</p>:<>
      {!current.rows.length&&<p>No Pittz listings returned on this page. Other marketplaces are not included yet.</p>}
      <div className="oox-listings-grid">{current.rows.map(({listing,nft,active})=><article className="oox-listing-card" key={listing.auctionId}>
        {nft&&<img src={getNftImage(nft)} alt={nft.name||listing.identifier}/>}
        <span className="oox-market-label">OOX · {active?'Active listing':'Inactive / expired'}</span>
        <h4>{nft?.name||listing.identifier}</h4><small>{listing.identifier}</small>
        <p className="oox-price">{formatAmount(listing.price,listing.paymentTokenDecimals)} <small>{listing.paymentToken}</small></p>
        <a className="btn" href={getNftMarketplace(listing)} target="_blank" rel="noopener noreferrer">Manage on OOX ↗</a>
      </article>)}</div>
      <div className="oox-listing-pages"><button className="btn" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page+1}</span><button className="btn" disabled={!Number.isFinite(current.total)||(page+1)*PAGE_SIZE>=current.total} onClick={()=>setPage(p=>p+1)}>Next</button></div>
      <p>Cancel and change-price actions open on OOX while those actions are being tested for PittzStop.</p>
    </>}
  </div>;
}
