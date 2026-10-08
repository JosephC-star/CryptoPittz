import {useEffect,useState} from 'react';
import OoxTradePanel from './OoxTradePanel';
import XoxnoPurchasePanel from '../xoxno/XoxnoPurchasePanel';
export default function MarketplaceTradePanel({onPurchaseAvailable,...props}) {
 const [oox,setOox]=useState(false),[xoxno,setXoxno]=useState(false);
 useEffect(()=>{onPurchaseAvailable?.(props.nft.identifier,oox||(!props.isOwned&&xoxno));},[onPurchaseAvailable,props.nft.identifier,props.isOwned,oox,xoxno]);
 return <><OoxTradePanel {...props} onAvailabilityChanged={setOox}/>{!props.isOwned&&<XoxnoPurchasePanel nft={props.nft} onAvailabilityChanged={setXoxno}/>}</>;
}
