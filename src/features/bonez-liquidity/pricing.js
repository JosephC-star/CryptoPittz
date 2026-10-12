import { human } from '../bonez-swap/validation.js';
import { FIRST, SECOND } from './validation.js';
export function validateLiquidityPrices(tokens){
 if(tokens?.length!==2)throw Error('Token prices unavailable.');
 for(const [i,id] of [FIRST,SECOND].entries())if(tokens[i]?.identifier!==id||tokens[i].decimals!==[6,18][i]||!Number.isFinite(tokens[i].price)||tokens[i].price<=0)throw Error('Token prices unavailable.');
 return {bonez:tokens[0].price,wegld:tokens[1].price,updated:Date.now()};
}
export function liquidityUsdValue(position,prices,now=Date.now()){
 if(!position)return null;
 if(position.lp==='0')return 0;
 if(!prices||!Number.isFinite(prices.updated)||now-prices.updated>120000||now<prices.updated||!Number.isFinite(prices.bonez)||prices.bonez<=0||!Number.isFinite(prices.wegld)||prices.wegld<=0)return null;
 const total=Number(human(position.first,6))*prices.bonez+Number(human(position.second,18))*prices.wegld;
 return Number.isFinite(total)&&total>=0?total:null;
}
export function formatLiquidityUsd(value){
 if(value===null)return 'Price unavailable';
 if(value>0&&value<0.01)return '<$0.01';
 return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
}
