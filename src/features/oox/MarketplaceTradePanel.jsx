import OoxTradePanel from './OoxTradePanel';
import XoxnoPurchasePanel from '../xoxno/XoxnoPurchasePanel';
export default function MarketplaceTradePanel(props){return <><OoxTradePanel {...props}/>{!props.isOwned&&<XoxnoPurchasePanel nft={props.nft}/>}</>;}
