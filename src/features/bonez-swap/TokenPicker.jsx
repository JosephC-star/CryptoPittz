import {useRef,useState} from 'react';
import {TOKENS,getToken} from './tokens';
export function TokenIcon({id}){
 const [failed,setFailed]=useState(false);
 const token=getToken(id);
 const src=id==='EGLD'?'https://tools.multiversx.com/assets-cdn/tokens/EGLD/icon.svg':id==='BONEZ-ff9a73'?'/images/cryptopittz-bonez-transparent.png':`https://raw.githubusercontent.com/multiversx/mx-assets/master/tokens/${id}/logo.svg`;
 return failed?<span className="token-initial">{token.symbol.slice(0,1)}</span>:<img src={src} alt="" onError={()=>setFailed(true)}/>;
}
export default function TokenPicker({value,onChange,label,disabled}){
 const dialog=useRef(null),[search,setSearch]=useState('');
 const token=getToken(value);
 const matches=TOKENS.filter(t=>[t.symbol,t.name,t.id].some(s=>s.toLowerCase().includes(search.toLowerCase().trim())));
 return <><button type="button" className="token token-picker-button" disabled={disabled} aria-label={`${label}: ${token.symbol}. Select token`} onClick={()=>{setSearch('');dialog.current.showModal();}}><TokenIcon key={value} id={value}/>{token.symbol}<span>⌄</span></button>
 <dialog className="token-dialog" ref={dialog} onClick={e=>{if(e.target===dialog.current)dialog.current.close();}}><div className="token-dialog-heading"><h3>Select a token</h3><button type="button" aria-label="Close token selector" onClick={()=>dialog.current.close()}>×</button></div><label className="token-search-label">Search name, ticker or token ID<input autoFocus value={search} placeholder="Find your currency…" onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')e.preventDefault();}}/></label><div className="token-options">{matches.map(t=><button type="button" className={value===t.id?'selected-token':''} key={t.id} onClick={()=>{onChange(t.id);dialog.current.close();}}><TokenIcon id={t.id}/><span><strong>{t.symbol}</strong><small>{t.name}</small><small className="token-id">{t.id}</small></span><span className="token-selected">{value===t.id?'✓':'→'}</span></button>)}{!matches.length&&<p>No matching supported tokens.</p>}</div><p className="token-dialog-foot">Mainnet tokens · Route availability depends on liquidity.</p></dialog></>;
}
