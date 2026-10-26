import {useEffect,useState} from 'react';
import './collectors.css';
export default function OwnerBadge({identifier,address}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[tick,setTick]=useState(0);
 useEffect(()=>{const controller=new AbortController();setData(null);setError('');fetch('/.netlify/functions/pittz-owner?'+new URLSearchParams(identifier?{identifier}:{address}),{signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Owner unavailable.');return d;}).then(d=>{if(!controller.signal.aborted)setData(d);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[identifier,address,tick]);
 if(error)return <div className="collector-owner"><span>{error}</span><button className="btn" onClick={()=>setTick(n=>n+1)}>Retry owner</button></div>;
 if(!data)return <p className="collector-owner" role="status">Checking owner…</p>;
 const short=data.address.slice(0,8)+'…'+data.address.slice(-5);
 if(data.role==='custody')return <div className="collector-owner"><span className="collector-avatar" aria-hidden="true">🔒</span><div><small>Held by marketplace / contract</small><strong>{short}</strong><small>Seller not verified. This is the custody address.</small></div></div>;
 return <a className="collector-owner collector-owner-link" href={'/collector/?address='+data.address} title={data.address}><span className="collector-avatar" aria-hidden="true">🐾{data.avatar&&<img src={data.avatar} alt="" onError={e=>{e.currentTarget.style.display='none';}}/>}</span><div><small>{identifier?(data.role==='seller'?'Listed by':'Owned by'):'Collector'}</small><strong>{data.name||short}</strong>{data.name&&<small>{short}</small>}</div><span className="collector-view">View pack →</span></a>;
}
