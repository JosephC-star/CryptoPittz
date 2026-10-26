export async function fetchListedNfts(collection,identifiers,{signal,fetchImpl=fetch,onBatch=()=>{}}={}){
 const ids=[...new Set(identifiers)];
 if(!['PITTZ-1a4c2d','PITTZVICE-c3ec94'].includes(collection)||ids.some(id=>!new RegExp('^'+collection+'-[a-f0-9]+$','i').test(id)))throw Error('Invalid listed Pittz identifiers.');
 const found=new Map();
 for(let offset=0;offset<ids.length;offset+=25){
  const batch=ids.slice(offset,offset+25),params=new URLSearchParams({identifiers:batch.join(','),size:String(batch.length)});
  const r=await fetchImpl('https://api.multiversx.com/nfts?'+params,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)});
  if(!r.ok)throw Error('Listed Pittz images could not load. Please retry.');const rows=await r.json();
  if(!Array.isArray(rows)||rows.some(n=>!batch.includes(n.identifier)||n.collection!==collection))throw Error('Listed Pittz data did not match the collection.');
  for(const n of rows)found.set(n.identifier,n);
  onBatch(ids.filter(id=>found.has(id)).map(id=>found.get(id)));
 }
 if(found.size!==ids.length)throw Error('Some listed Pittz could not load. Please retry.');
 return ids.map(id=>found.get(id));
}
