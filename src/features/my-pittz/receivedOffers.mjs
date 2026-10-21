import {offerSpec,nftIdentity} from '../oox/offerValidation.mjs';
// Intersect with current wallet NFTs: old-owner, expired and unrelated offers
// must not look like actionable offers for this wallet.
export function groupReceivedOffers(offers,nfts,address,now=Math.floor(Date.now()/1000)){
 const owned=new Map();for(const nft of nfts){try{const id=nftIdentity(nft);owned.set(id.collection+':'+id.nonce,nft);}catch{/* Other collections are outside My Pittz. */}}
 const groups=new Map(),seen=new Set();
 for(const offer of offers){if(!offer||typeof offer!=='object')continue;if(seen.has(offer.id))continue;const nft=owned.get(offer.collection+':'+offer.nonce);if(!nft)continue;
  try{offerSpec({action:'accept',address,owner:address,nft,offer},now);}catch{continue;}
  seen.add(offer.id);let group=groups.get(nft.identifier);if(!group){group={nft,offers:[],highest:'0'};groups.set(nft.identifier,group);}group.offers.push(offer);if(BigInt(offer.amount)>BigInt(group.highest))group.highest=offer.amount;
 }
 return [...groups.values()].sort((a,b)=>BigInt(a.highest)===BigInt(b.highest)?a.nft.identifier.localeCompare(b.nft.identifier):BigInt(a.highest)>BigInt(b.highest)?-1:1);
}
