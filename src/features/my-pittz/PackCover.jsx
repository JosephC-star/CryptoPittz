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
 return picks.length?<div className="pack-entrance-art" aria-hidden="true">{picks.map(n=><img key={n.identifier} src={getNftImage(n)} alt=""/>)}</div>:<div className="pack-mystery-art"><div className="pack-mystery-cards" aria-hidden="true">{[0,1,2].map(i=><span key={i}>🐾<b>?</b></span>)}</div><strong>{address?'Your pack is getting ready…':'Connect to reveal your pack'}</strong><small>{address?'Your own Pittz belong here.':'Your Pittz. Your spotlight.'}</small></div>;
}
