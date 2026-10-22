import {copyParagraphs} from '../../../public/flea-market/merchant-copy.mjs';
export default function MerchantCopy({text,shop=false}){
 return <div className={'ml-merchant-copy'+(shop?' ml-shop-story':'')}>{copyParagraphs(text).map((tokens,i)=><p key={i}>{tokens.map((token,j)=>token.kind==='strong'?<strong key={j}>{token.text}</strong>:token.kind==='em'?<em key={j}>{token.text}</em>:token.text)}</p>)}</div>;
}
