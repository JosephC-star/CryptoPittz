import { BONEZ_PAIR_ADDRESS } from '../../config/collections.js';
import { hex, textHex } from '../bonez-swap/validation.js';
export const PAIR=BONEZ_PAIR_ADDRESS, FIRST='BONEZ-ff9a73', SECOND='WEGLD-bd4d79', LP='BONEZWEGLD-c5db6b';
export function validatePool(pool){
 if(pool?.address!==PAIR||pool.firstToken!==FIRST||pool.secondToken!==SECOND||pool.lpToken!==LP||![1,2].includes(pool.state))throw Error('The BONEZ pool configuration could not be verified.');
 for(const key of ['firstReserve','secondReserve','totalSupply'])if(!/^\d{1,80}$/.test(pool[key]||'')||BigInt(pool[key])<=0n)throw Error('The BONEZ pool has no verified active liquidity.');
 return pool;
}
export function liquidityQuote(pool,amount,slippage=50){
 validatePool(pool);
 if(!/^\d{1,40}$/.test(amount)||BigInt(amount)<=0n||![50,100,200].includes(slippage))throw Error('Choose a valid amount and slippage tolerance.');
 const first=BigInt(amount),r1=BigInt(pool.firstReserve),r2=BigInt(pool.secondReserve),supply=BigInt(pool.totalSupply);
 const second=(first*r2+r1-1n)/r1,usedSecond=first*r2/r1;
 const lp1=first*supply/r1,lp2=usedSecond*supply/r2,estimatedLp=lp1<lp2?lp1:lp2;
 const minFirst=first*BigInt(10000-slippage)/10000n,minSecond=usedSecond*BigInt(10000-slippage)/10000n;
 if(minFirst<=0n||minSecond<=0n||estimatedLp<=0n)throw Error('Amount is too small to provide liquidity safely.');
 return {first:amount,second:second.toString(),minFirst:minFirst.toString(),minSecond:minSecond.toString(),estimatedLp:estimatedLp.toString(),slippage};
}
export function assertCurrentRatio(pool,terms){
 validatePool(pool);
 const first=BigInt(terms.first),second=BigInt(terms.second),r1=BigInt(pool.firstReserve),r2=BigInt(pool.secondReserve);
 const optimalSecond=first*r2/r1;
 const usedFirst=optimalSecond<=second?first:second*r1/r2,usedSecond=optimalSecond<=second?optimalSecond:second;
 if(usedFirst<BigInt(terms.minFirst)||usedSecond<BigInt(terms.minSecond))throw Error('Pool ratio moved beyond your slippage limit. Get a fresh liquidity quote.');
}
export function liquiditySpec(address,terms,addressHex){
 const pairHex=addressHex(PAIR);addressHex(address);
 if(!/^[a-f0-9]{64}$/.test(pairHex))throw Error('Invalid pair address encoding.');
 for(const key of ['first','second','minFirst','minSecond'])if(!/^\d{1,80}$/.test(terms[key]||'')||BigInt(terms[key])<=0n)throw Error('Invalid liquidity amount.');
 if(BigInt(terms.minFirst)>BigInt(terms.first)||BigInt(terms.minSecond)>BigInt(terms.second))throw Error('Invalid liquidity limits.');
 const args=[pairHex,'02',textHex(FIRST),'00',hex(terms.first),textHex(SECOND),'00',hex(terms.second),textHex('addLiquidity'),hex(terms.minFirst),hex(terms.minSecond)];
 return {sender:address,receiver:address,value:'0',gasLimit:30000000,gasPrice:1000000000,version:2,chainID:'1',data:'MultiESDTNFTTransfer@'+args.join('@')};
}
