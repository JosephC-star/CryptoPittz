import {useState} from 'react';
export default function ShareShop({booth,name}){
 const [message,setMessage]=useState(''),[manual,setManual]=useState(false),url=new URL('/market-shop?booth='+booth,window.location.origin).href;
 async function copy(){try{await navigator.clipboard.writeText(url);setMessage('Shop link copied.');setManual(false);}catch{setManual(true);setMessage('Select and copy your shop link below.');}}
 async function share(){if(navigator.share){try{await navigator.share({title:name+' · Pittz Flea Market',url});return;}catch(error){if(error.name==='AbortError')return;}}await copy();}
 return <div className="ml-share-shop"><div className="ml-actions"><button type="button" onClick={share}>Share shop ↗</button><button type="button" onClick={copy}>Copy shop link</button></div>{manual&&<label>Your shop link<input readOnly value={url} onFocus={e=>e.target.select()}/></label>}<p role="status">{message}</p></div>;
}
