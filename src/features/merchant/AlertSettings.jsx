import {useEffect,useState} from 'react';
async function api(route,body){const r=await fetch('/.netlify/functions/market-alerts?route='+route,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error||'Email settings unavailable.');return data;}
export default function AlertSettings({onChange}){
 const [data,setData]=useState(null),[email,setEmail]=useState(''),[code,setCode]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function refresh(){const result=await api('settings');setData(result);setEmail(result.settings.email||result.settings.pending_email||'');onChange?.(result.settings.enabled===true&&!!result.settings.verified_at);}
 useEffect(()=>{refresh().catch(e=>setMessage(e.message));},[]);
 async function action(route,body){setBusy(true);setMessage('');try{const result=await api(route,body);setMessage(result.message||(route==='verify'?'Email verified. New inquiries will trigger an alert.':'Email alerts turned off.'));setCode('');await refresh();}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 return <section id="merchant-alerts" tabIndex={-1} className="ml-panel" style={{marginTop:24}}><h2>New inquiry email alerts</h2><p>Get a short notification when a customer contacts your shop. Customer messages and pictures stay in your private inbox.</p>
 {data&&!data.configured&&<p>Email delivery is awaiting setup. You can still read every inquiry in Customer inquiries.</p>}
 {data?.settings.enabled&&<p>Alerts enabled for <b>{data.settings.email}</b>.</p>}
 <form onSubmit={e=>{e.preventDefault();void action('start',{email});}}><label>Alert email<input type="email" required maxLength={320} value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/></label><button type="submit" disabled={busy||!data?.configured}>Send verification code</button></form>
 {data?.settings.pending_email&&<form onSubmit={e=>{e.preventDefault();void action('verify',{code});}}><p>Code sent to {data.settings.pending_email}. It expires after 15 minutes.</p><label>Eight-digit email code<input inputMode="numeric" pattern="[0-9]{8}" required maxLength={8} value={code} onChange={e=>setCode(e.target.value)} disabled={busy}/></label><button disabled={busy}>Verify and enable alerts</button></form>}
 {data?.settings.enabled&&<button style={{marginTop:16}} disabled={busy} onClick={()=>action('disable',{})}>Turn off email alerts</button>}
 <p role="status">{message}</p></section>;
}
