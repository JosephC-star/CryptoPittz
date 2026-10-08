import { useEffect, useState } from 'react';
import { formatAmount } from '@oox-marketplace/sdk';
import { client, json } from './trade';
import { readListingItems } from './listingResponse';
import { getNftImage, getNftMarketplace } from '../../utils/nftUtils';
import { compactNftPrice } from '../../utils/nftPrice';
import './preview.css';
const PAGE_SIZE=12;
export default function MyListings({address}) {
  return <WalletListings key={address || "disconnected"} address={address}/>;
}
function WalletListings({address}) {
  const [page,setPage]=useState(0),[refresh,setRefresh]=useState(0),[result,setResult]=useState(null);
  useEffect(()=>{
    let active=true;
    if(!address)return;
    async function load(){
      const sources=await Promise.allSettled([
        (async()=>{
          const response=await client.api.getListings({seller:address,from:page*PAGE_SIZE,size:PAGE_SIZE});
          const all=readListingItems(response);
          if(all.some(x=>x.seller!==address))throw Error('Marketplace returned listings for a different wallet.');
          const rows=await Promise.all(all.filter(x=>['PITTZ-1a4c2d','PITTZVICE-c3ec94'].includes(x.collection)).map(async listing=>{
            let nft=null;try{const candidate=await json(`https://api.multiversx.com/nfts/${listing.identifier}`);if(candidate.identifier===listing.identifier)nft=candidate;}catch{ /* Keep the listing if artwork is unavailable. */ }
            return {listing,nft,marketplace:'OOX',price:compactNftPrice(formatAmount(listing.price,listing.paymentTokenDecimals)),href:getNftMarketplace(listing),active:listing.isActive&&listing.deadline>Date.now()/1000};
          }));
          return {rows,hasMore:Number.isFinite(response.total)?(page+1)*PAGE_SIZE<response.total:all.length===PAGE_SIZE};
        })(),
        (async()=>{
          const response=await json(`/.netlify/functions/xoxno-user-listings?seller=${encodeURIComponent(address)}&page=${page}`);
          const rows=response.resources.map(nft=>{
            const sale=nft.saleInfo;
            if(sale.seller!==address)throw Error('Marketplace returned listings for a different wallet.');
            return {nft,listing:{...sale,identifier:nft.identifier,paymentToken:sale.paymentToken},marketplace:'XOXNO',price:sale.minBidShort==null?'—':compactNftPrice(String(sale.minBidShort)),href:`https://xoxno.com/nft/${encodeURIComponent(nft.identifier)}`,active:sale.startTime<=Date.now()/1000&&(!sale.deadline||sale.deadline>Date.now()/1000)};
          });
          return {rows,hasMore:response.hasMoreResults};
        })()
      ]);
      if(active)setResult({address,page,refresh,rows:sources.flatMap(s=>s.status==='fulfilled'?s.value.rows:[]),hasMore:sources.some(s=>s.status==='fulfilled'&&s.value.hasMore),errors:sources.flatMap((s,i)=>s.status==='rejected'?[`${i===0?'OOX':'XOXNO'}: ${s.reason.message}`]:[])});
    }
    load();return()=>{active=false};
  },[address,page,refresh]);
  const current=result?.address===address&&result.page===page&&result.refresh===refresh?result:null;
  return <div className="oox-listings">
    <div className="oox-listings-heading"><div><h3>Your Pittz listings</h3><p>Listed Pittz can be held by the marketplace contract, so they appear here separately from your wallet.</p></div><button className="btn" onClick={()=>setRefresh(x=>x+1)}>Refresh listings</button></div>
    {!address?<p>Connect your wallet to see your listings.</p>:!current?<p role="status">Looking up your OOX and XOXNO listings…</p>:<>
      {current.errors.map(error=><p role="alert" key={error}>{error}</p>)}
      {!current.rows.length&&<p>No Pittz listings returned on this page.</p>}
      <div className="oox-listings-grid">{current.rows.map(({listing,nft,active,marketplace,price,href})=><article className="oox-listing-card" key={`${marketplace}-${listing.auctionId}-${listing.identifier}`}>
        {nft&&<img src={getNftImage(nft)} alt={nft.name||listing.identifier}/>}
        <span className="oox-market-label">{marketplace} · {active?'Active listing':'Inactive / expired'}</span>
        <h4>{nft?.name||listing.identifier}</h4><small>{listing.identifier}</small>
        <p className="oox-price">{price} <small>{listing.paymentToken}</small></p>
        <a className="btn" href={href} target="_blank" rel="noopener noreferrer">Manage on {marketplace} ↗</a>
      </article>)}</div>
      <div className="oox-listing-pages"><button className="btn" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page+1}</span><button className="btn" disabled={!current.hasMore} onClick={()=>setPage(p=>p+1)}>Next</button></div>
      <p>Showing your listings from OOX and XOXNO. Cancel or change a price on the marketplace where you listed it.</p>
    </>}
  </div>;
}
