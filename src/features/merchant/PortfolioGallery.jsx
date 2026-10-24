import {useEffect,useState} from 'react';
import {readJson} from '../../utils/readJson.mjs';
import ProductGallery from './ProductGallery';
import MerchantCopy from './MerchantCopy';
export default function PortfolioGallery({booth,onAsk}){
 const [items,setItems]=useState([]),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{const controller=new AbortController();setError(false);readJson('/.netlify/functions/market-portfolio?booth='+booth,{signal:controller.signal}).then(data=>{if(!Array.isArray(data.items))throw Error();setItems(data.items);}).catch(()=>{if(!controller.signal.aborted)setError(true);});return()=>controller.abort();},[booth,attempt]);
 if(error)return <section className="ml-portfolio-status"><p>Past work could not load.</p><button onClick={()=>setAttempt(n=>n+1)}>Retry past-work gallery</button></section>;
 if(!items.length)return null;
 return <section className="ml-portfolio" aria-labelledby="past-work-title"><div className="ml-portfolio-heading"><span className="ml-eyebrow">The maker’s wall</span><h2 id="past-work-title">Past work. Real craftsmanship.</h2><p>Previous creations, custom projects and proud moments.</p><span className="ml-pill">Showcase only · These pieces are not for sale</span></div><div className="ml-grid ml-portfolio-grid">{items.map(item=><article key={item.slot}><ProductGallery name={item.title} photos={[item.image_url]}/><div className="ml-card-body"><span className="ml-eyebrow">Past work / Showcase</span><h3>{item.title}</h3><MerchantCopy text={item.caption}/><button onClick={()=>onAsk(item)}>Ask about something similar ↗</button></div></article>)}</div></section>;
}
