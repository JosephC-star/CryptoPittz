import {useEffect,useMemo,useState} from 'react';
import NftCard from '../../components/nft/NftCard';
import {loadReceivedOffers} from '../oox/offerTransactions';
import {groupReceivedOffers} from './receivedOffers.mjs';
import {human} from '../bonez-swap/validation';
const PAGE_SIZE=40;
export default function MyReceivedOffers({address,nfts,loading:walletLoading,error:walletError,onRetry,onConnect,onOpenNft}){
 const [offers,setOffers]=useState([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[page,setPage]=useState(1),[now,setNow]=useState(()=>Math.floor(Date.now()/1000));
 useEffect(()=>{setPage(1);setOffers([]);setError('');if(!address)return;const controller=new AbortController();setLoading(true);
  loadReceivedOffers(address,controller.signal).then(rows=>{if(!controller.signal.aborted){setOffers(rows);setNow(Math.floor(Date.now()/1000));}}).catch(e=>{if(!controller.signal.aborted)setError(e.message||'Offers could not be loaded.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();
 },[address,refresh]);
 useEffect(()=>{const update=()=>setRefresh(n=>n+1);window.addEventListener('pittz-offers-updated',update);return()=>window.removeEventListener('pittz-offers-updated',update);},[]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Math.floor(Date.now()/1000)),15000);return()=>clearInterval(timer);},[]);
 const groups=useMemo(()=>groupReceivedOffers(offers,nfts,address,now),[offers,nfts,address,now]);
 const pages=Math.max(1,Math.ceil(groups.length/PAGE_SIZE)),current=Math.min(page,pages),visible=groups.slice((current-1)*PAGE_SIZE,current*PAGE_SIZE);
 return <div className="panel"><div className="inner"><div className="my-offers-heading"><div><h3>Offers received</h3><p>Direct OOX offers appear below. Collection offers are in the Dawg Pound.</p></div>{address&&<button className="btn" disabled={loading} onClick={()=>setRefresh(n=>n+1)}>Refresh offers</button>}</div>
 {!address?<><p>Connect your wallet to check offers on your Pittz.</p><button className="btn" onClick={onConnect}>Connect wallet</button></>:walletError?<div role="status"><p>{walletError}</p><button className="btn" onClick={onRetry}>Retry wallet lookup</button></div>:error?<div role="status"><p>{error}</p><button className="btn" onClick={()=>setRefresh(n=>n+1)}>Retry offers</button></div>:loading||walletLoading?<p role="status">Checking your wallet and marketplace offers…</p>:<>
 <p role="status">{groups.length} Pittz with {groups.reduce((sum,g)=>sum+g.offers.length,0)} active {groups.reduce((sum,g)=>sum+g.offers.length,0)===1?'offer':'offers'}.</p>
 {!groups.length&&<p>No active direct EGLD offers on your wallet’s Pittz right now. Expired, withdrawn, collection and trait offers are not shown.</p>}
 <div className="wallet-nft-grid owned-nft-grid">{visible.map(group=><div className="my-received-offer" key={group.nft.identifier}><NftCard nft={group.nft} isOwned onClick={()=>onOpenNft(group.nft,visible.map(g=>g.nft),true)}/><div className="my-received-offer-summary"><strong>{group.offers.length} active {group.offers.length===1?'offer':'offers'}</strong><span>Highest: {human(group.highest,18)} EGLD</span><button className="btn" onClick={()=>onOpenNft(group.nft,visible.map(g=>g.nft),true)}>View offers →</button></div></div>)}</div>
 {pages>1&&<nav className="my-pittz-pagination" aria-label="Pittz with offers pages"><button disabled={current===1} onClick={()=>setPage(n=>Math.max(1,n-1))}>← Previous</button><span>Page {current} of {pages}</span><button disabled={current===pages} onClick={()=>setPage(n=>Math.min(pages,n+1))}>Next →</button></nav>}
 </>}<a className="btn" href="/dawg-pound/?tab=offers">Collection Offers · Pittz Dawg Pound →</a><p className="pittz-offer-note">Covers direct EGLD offers through our OOX integration. Choose View offers to review a sale; accepting transfers your NFT.</p></div></div>;
}
