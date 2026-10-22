import {useEffect,useState} from 'react';
import {readJson} from '../../utils/readJson.mjs';
import {REVIEW_LABELS} from '../../../shared/market-reviews.mjs';
const endpoint='/.netlify/functions/market-reviews';
export default function ShopReviews({booth}){
 const [data,setData]=useState(null),[offset,setOffset]=useState(0),[attempt,setAttempt]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{if(location.hash==='#shop-reviews')document.getElementById('shop-reviews')?.scrollIntoView();},[booth]);
 const [rating,setRating]=useState(0),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[sent,setSent]=useState(false),[requestId,setRequestId]=useState(()=>crypto.randomUUID());
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');setData(null);
  readJson(endpoint+'?booth='+booth+'&offset='+offset,{signal:controller.signal}).then(result=>{if(!Array.isArray(result.reviews)||!Number.isInteger(result.count))throw Error();if(!controller.signal.aborted)setData(result);}).catch(()=>{if(!controller.signal.aborted)setError('Reviews are not available yet. Please check back soon.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();
 },[booth,offset,attempt]);
 async function submit(event){event.preventDefault();if(busy||sent||!data)return;const form=new FormData(event.currentTarget);setBusy(true);setMessage('Sending your pack verdict…');
  try{const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({booth,request_id:requestId,rating,name:form.get('name'),comment:form.get('comment'),website:form.get('website'),consent:form.get('consent')==='on'})});const result=await response.json();if(!response.ok)throw Error(result.error||'Review could not be sent.');setMessage(result.message);setSent(true);setOffset(0);setAttempt(n=>n+1);}catch(error){setMessage(error.message||'Review could not be sent. Try again.');}finally{setBusy(false);}
 }
 return <section id="shop-reviews" className="ml-panel ml-reviews"><span className="ml-eyebrow">Straight from the pack</span><h2>Pack verdict.</h2><p>Our stars have attitude. Five poops means <strong>“This shop is the sh*t.”</strong> 💩</p>
 <p className="ml-review-disclaimer">Community opinions · Purchases are not verified. New reviews appear immediately. Admins may hide reviews; ratings reflect visible reviews only.</p>
 {loading?<p role="status">Loading pack verdicts…</p>:error?<div role="status"><p>{error}</p><button type="button" onClick={()=>setAttempt(n=>n+1)}>Retry reviews</button></div>:<>
 <div className="ml-review-summary"><span aria-hidden="true">💩</span><div><strong>{data.count?Number(data.average).toFixed(1)+' / 5':'No ratings yet'}</strong><small>{data.count?data.count+' published '+(data.count===1?'review':'reviews'):'Be the first to leave a pack verdict.'}</small></div></div>
 <div className="ml-review-list">{data.reviews.map(review=><article key={review.id}><div className="ml-review-byline"><strong>{review.display_name}</strong><time dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString()}</time></div><p className="ml-review-score"><span aria-hidden="true">{'💩'.repeat(review.rating)}</span><span>{review.rating} / 5 · {REVIEW_LABELS[review.rating]}</span></p><p className="ml-review-comment">{review.comment}</p></article>)}</div>
 {(offset>0||data.hasMore)&&<div className="ml-actions"><button onClick={()=>setOffset(n=>Math.max(0,n-10))} disabled={offset===0}>← Newer reviews</button><button onClick={()=>setOffset(n=>n+10)} disabled={!data.hasMore}>Older reviews →</button></div>}
 </>}
 {!sent&&<form onSubmit={submit} onChange={()=>setRequestId(crypto.randomUUID())}><h3>Leave your pack verdict</h3><fieldset disabled={busy}><legend>Your rating (required)</legend><div className="ml-poop-picker">{[1,2,3,4,5].map(value=><label key={value} className={rating>=value?'is-filled':''}><input type="radio" name="rating" required value={value} checked={rating===value} onChange={()=>setRating(value)}/><span aria-hidden="true">💩</span><span className="ml-visually-hidden">{value} out of 5: {REVIEW_LABELS[value]}</span></label>)}</div><p className="ml-review-rating-label" aria-live="polite">{rating?rating+' / 5 · '+REVIEW_LABELS[rating]:'Choose one to five poops. Higher means better.'}</p></fieldset>
 <label>Public display name<input name="name" required minLength={2} maxLength={60} disabled={busy} autoComplete="nickname"/></label><label>Your experience<textarea name="comment" required minLength={10} maxLength={1500} disabled={busy} placeholder="Tell the pack about your experience with this shop."/></label>
 <div className="ml-review-trap" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
 <p>No private contact details, payment information, threats, or spam. Honest criticism is welcome; moderation applies to every rating.</p><label className="ml-review-consent"><input name="consent" type="checkbox" required disabled={busy}/>I’m sharing my own experience and agree to publish my name, rating, and review immediately.</label><button className="ml-primary" disabled={busy||!rating||!data}>{busy?'Sending…':'Submit pack verdict'}</button></form>}
 <p role="status" className="ml-message">{message}</p></section>;
}
