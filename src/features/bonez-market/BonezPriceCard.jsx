import useBonezMarket from './useBonezMarket';
import {formatBonezUsd} from '../../utils/formatters';
import './compact-market.css';
export default function BonezPriceCard(){
 const {market,marketStatus}=useBonezMarket(true,{historyEnabled:false});
 const change=market?.priceChange?.h24===undefined?null:Number(market.priceChange.h24);
 return <a className="bonez-price-card" href="/financial-district/#bonez-market"><img src="/images/cryptopittz-bonez-transparent.png" alt="" width="44" height="44"/><div className="bonez-price-card-copy"><small>THE PACK’S CURRENCY</small><strong>BONEZ Market</strong></div><div className="bonez-price-card-price"><strong>{market?formatBonezUsd(market.priceUsd):'—'}</strong><span className={change===null?'':change>=0?'market-up':'market-down'}>{Number.isFinite(change)&&change!==null?(change>=0?'+':'')+change.toFixed(2)+'% · 24h':market?'Live market':marketStatus==='unavailable'?'Pricing unavailable':'Checking market…'}</span></div><span className="bonez-price-card-link">Visit the Financial District <b aria-hidden="true">↗</b></span></a>;
}
