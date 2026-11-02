import {useId,useRef} from 'react';
import {copyParagraphs,plainCopy} from '../../../public/flea-market/merchant-copy.mjs';
export default function MerchantCopy({text,shop=false,compact=false,title='Full description'}){
 const dialog=useRef(null),heading=useId();
 const paragraphs=copyParagraphs(text),plain=plainCopy(text);
 const long=compact&&(plain.length>400||paragraphs.length>3||String(text||'').split('\n').length>6);
 const contents=paragraphs.map((tokens,i)=><p key={i}>{tokens.map((token,j)=>token.kind==='strong'?<strong key={j}>{token.text}</strong>:token.kind==='em'?<em key={j}>{token.text}</em>:token.text)}</p>);
 if(!long)return <div className={'ml-merchant-copy'+(shop?' ml-shop-story':'')}>{contents}</div>;
 const preview=plain.length>400?plain.slice(0,400).replace(/\s+\S*$/,'')+'…':plain;
 return <div className={'ml-copy-preview-wrap'+(shop?' ml-shop-story':'')}>
  <p className="ml-copy-preview">{preview}</p>
  <button type="button" className="ml-read-more" onClick={()=>dialog.current?.showModal()} aria-haspopup="dialog">Read more <span className="ml-visually-hidden">about {title}</span> ↗</button>
  <dialog ref={dialog} className="ml-copy-dialog" aria-labelledby={heading}>
   <div className="ml-copy-dialog-heading"><h2 id={heading}>{title}</h2><button type="button" aria-label="Close full description" onClick={()=>dialog.current?.close()}>×</button></div>
   <div className="ml-merchant-copy">{contents}</div>
   <button type="button" onClick={()=>dialog.current?.close()}>Back to the shop</button>
  </dialog>
 </div>;
}
