import {useEffect,useState} from 'react';
import {loadRandomSpotlight} from './randomSpotlight.mjs';
export default function useRandomSpotlight(collection){
 const [state,setState]=useState({collection:'',nfts:[],error:''}),[tick,setTick]=useState(0);
 useEffect(()=>{const controller=new AbortController();setState({collection,nfts:[],error:''});loadRandomSpotlight(collection,{signal:controller.signal}).then(nfts=>{if(!controller.signal.aborted)setState({collection,nfts,error:''});}).catch(()=>{if(!controller.signal.aborted)setState({collection,nfts:[],error:'Spotlight could not load.'});});return()=>controller.abort();},[collection,tick]);
 return {...(state.collection===collection?state:{nfts:[],error:''}),retry:()=>setTick(n=>n+1)};
}
