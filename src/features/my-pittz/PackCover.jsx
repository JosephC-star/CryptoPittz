import {useMemo,useState} from 'react';
import {getNftImage} from '../../utils/nftUtils';
export default function PackCover({address,nfts}){
 const [seed]=useState(()=>Math.random());
 const picks=useMemo(()=>{
  if(!address)return [];
  const unique=[...new Map(nfts.filter(n=>getNftImage(n)).map(n=>[n.identifier,n])).values()];
  // A visit-specific seed keeps the same three through unrelated page renders.
  const score=n=>{let h=Math.floor(seed*0xffffffff);for(const c of address+n.identifier)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
  return unique.sort((a,b)=>score(a)-score(b)).slice(0,3);
 },[address,nfts,seed]);
 return <div className="pack-entrance-art" aria-hidden="true">{picks.length?picks.map(n=><img key={n.identifier} src={getNftImage(n)} alt=""/>):['green','captain','pink'].map(p=><img key={p} src={'/images/pittzboy/pittzboy-'+p+'.jpg'} alt=""/>)}</div>;
}
