import {useEffect,useState} from 'react';
import {fetchListedNfts} from './listedNfts.mjs';
export default function useListedNfts(collection,listings){
 const [state,setState]=useState({key:'',nfts:[],loading:false,error:''}),[retryTick,setRetryTick]=useState(0);
 const ids=[...new Set(listings.map(l=>l.identifier))].sort(),key=collection+':'+ids.join(',');
 useEffect(()=>{const controller=new AbortController();setState({key,nfts:[],loading:ids.length>0,error:''});
 fetchListedNfts(collection,ids,{signal:controller.signal,onBatch:nfts=>{if(!controller.signal.aborted)setState({key,nfts,loading:true,error:''});}}).then(nfts=>{if(!controller.signal.aborted)setState({key,nfts,loading:false,error:''});}).catch(e=>{if(!controller.signal.aborted)setState(s=>({...s,loading:false,error:e.message}));});return()=>controller.abort();
 },[key,retryTick]);
 return {...(state.key===key?state:{nfts:[],loading:ids.length>0,error:''}),retry:()=>setRetryTick(n=>n+1)};
}
