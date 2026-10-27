export function randomOffsets(total,random=Math.random){
 if(!Number.isSafeInteger(total)||total<0)throw Error('Invalid collection count.');
 const swaps=new Map(),result=[];
 for(let left=total;left>Math.max(0,total-3);left--){const roll=random();if(!(roll>=0&&roll<1))throw Error('Invalid random value.');const index=Math.floor(roll*left);result.push(swaps.get(index)??index);swaps.set(index,swaps.get(left-1)??left-1);}
 return result;
}
export async function loadRandomSpotlight(collection,{signal,fetchImpl=fetch,random=Math.random}={}){
 if(!['PITTZ-1a4c2d','PITTZVICE-c3ec94'].includes(collection))throw Error('Unsupported collection.');
 const request=async url=>{const r=await fetchImpl(url,{cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)});if(!r.ok)throw Error('Spotlight unavailable.');return r.json();};
 const base='https://api.multiversx.com/collections/'+collection+'/nfts';
 const count=await request(base+'/count'),offsets=randomOffsets(count,random);
 const rows=await Promise.all(offsets.map(from=>request(base+'?'+new URLSearchParams({from:String(from),size:'1'}))));
 const nfts=rows.map(row=>{if(!Array.isArray(row)||row.length!==1||row[0].collection!==collection||!row[0].identifier?.startsWith(collection+'-'))throw Error('Spotlight response mismatch.');return row[0];});
 if(new Set(nfts.map(n=>n.identifier)).size!==nfts.length)throw Error('Duplicate spotlight response.');return nfts;
}
