import {useEffect,useState} from 'react';
import {human} from '../bonez-swap/validation';
export default function XoxnoCollectionOffers({collection}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[refresh,setRefresh]=useState(0),[page,setPage]=useState(null);
 useEffect(()=>{setPage(null);setData(null);},[collection]);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setData(null);setError('');
 const params=new URLSearchParams({collection,...(page?.collection===collection?{continuationToken:page.token}:{})});
 fetch('/.netlify/functions/xoxno-collection-offers?'+params,{signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'XOXNO offers unavailable.');return d;}).then(d=>{if(!controller.signal.aborted)setData(d);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();
 },[collection,refresh,page]);
 const href='https://xoxno.com/collection/'+collection;
 return <section aria-label="XOXNO collection offers"><strong>XOXNO offers</strong><p>Browse here. Create, accept or manage on XOXNO.</p><a className="btn" href={href} target="_blank" rel="noopener noreferrer">Open collection on XOXNO ↗</a> <button className="btn" disabled={loading} onClick={()=>setRefresh(n=>n+1)}>Refresh XOXNO</button>
 {loading?<p role="status">Checking XOXNO…</p>:error?<p role="status">{error}</p>:data&&<>{!data.offers.length&&<p>No active EGLD offers reported by XOXNO on this page.</p>}<div className="pittz-offer-list">{data.offers.map(o=><article key={o.id}><strong>{human(o.amount,18)} EGLD per Pittz · XOXNO #{o.id}</strong><p>{o.traitOffer?'Trait offer · Eligibility required':'Collection-wide offer'} · Quantity: {o.quantity}</p>{o.traitOffer&&<div className="offer-required-traits"><strong>Required traits</strong>{o.traits.length?<ul>{[...new Set(o.traits.map(t=>t.type))].map(type=><li key={type}><b>{type}:</b> {o.traits.filter(t=>t.type===type).map(t=>t.value).join(', ')}</li>)}</ul>:<p>Trait details unavailable. Check this offer on XOXNO.</p>}<small>XOXNO checks the exact trait requirements before acceptance.</small></div>}<a className="btn" href={href} target="_blank" rel="noopener noreferrer">View in XOXNO collection ↗</a></article>)}</div>{data.hasMore&&<button className="btn" onClick={()=>setPage({collection,token:data.continuationToken})}>Next XOXNO offers →</button>}{page&&<button className="btn" onClick={()=>setPage(null)}>First page</button>}<small>XOXNO-reported availability; final eligibility and funds are checked there.</small></>}
 </section>;
}
