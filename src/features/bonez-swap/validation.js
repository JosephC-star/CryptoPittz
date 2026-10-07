export const BONEZ = 'BONEZ-ff9a73';
export const WEGLD = 'WEGLD-bd4d79';
export const ROUTER = 'erd1qqqqqqqqqqqqqpgq360nakqgsp5zkmguptucpjy6n4n3du7e5snsd2swzq';
export const MAX_AGE = 30000;
export function atomic(value, decimals) {
  if (!/^\d+(\.\d*)?$/.test(value)) throw Error('Enter a positive amount using a decimal point.');
  const [whole, part=''] = value.split('.');
  if (part.length > decimals) throw Error(`Use up to ${decimals} decimal places.`);
  const amount = BigInt(whole + part.padEnd(decimals,'0'));
  if (amount <= 0n || amount.toString().length > 40) throw Error('Enter a valid positive amount.');
  return amount.toString();
}
export function human(raw, decimals) {
  const s=BigInt(raw).toString().padStart(decimals+1,'0');
  const fraction=s.slice(-decimals).replace(/0+$/,'');
  return s.slice(0,-decimals)+(fraction ? '.'+fraction : '');
}
export function hex(raw) { const s=BigInt(raw).toString(16);return s.padStart(Math.ceil(s.length/2)*2,'0'); }
export function textHex(s) {return Array.from(new TextEncoder().encode(s),b=>b.toString(16).padStart(2,'0')).join('');}
const nestedText=s=>(textHex(s).length/2).toString(16).padStart(8,'0')+textHex(s);
const types={onedex:4,xexchange:5,jexchange_lp:6};
// Restrict this initial integration to the regular swap pool types observed in live BONEZ routes.
export function validateQuote(q, input, amount, addressHex) {
  const tokenIn=input==='EGLD'?WEGLD:BONEZ, tokenOut=input==='EGLD'?BONEZ:WEGLD;
  if (!q || q.amount_in!==amount || !/^\d+$/.test(q.net_amount_out) || BigInt(q.net_amount_out)<=0n) throw Error('Quote amount mismatch.');
  const route=q.route, hops=route?.hops;
  if(route?.token_in!==tokenIn || route?.token_out!==tokenOut || !Array.isArray(hops) || !hops.length || hops.length>4) throw Error('Unexpected swap route.');
  let token=tokenIn;
  let payload=nestedText(tokenIn)+hops.length.toString(16).padStart(8,'0');
  for(const hop of hops) {
    const p=hop.pool;
    if(hop.token_in!==token || !/^[A-Z0-9]+-[a-f0-9]{6}$/.test(hop.token_out) || !p?.tokens_in?.includes(token) || !p.tokens_out?.includes(hop.token_out) || !types[p.type]) throw Error('Unsupported swap pool.');
    const address=addressHex(p.sc_address);
    if(!/^[a-f0-9]{64}$/.test(address) || !address.startsWith('00000000000000000500')) throw Error('Invalid swap contract.');
    payload+=address+types[p.type].toString(16).padStart(2,'0')+nestedText(hop.token_out);
    token=hop.token_out;
  }
  if(token!==tokenOut || q.route_payload!==payload || q.amounts_and_routes_payload!==hex(amount)+'@'+payload) throw Error('Quote route payload mismatch.');
  if(!Number.isSafeInteger(Number(q.estimated_gas)) || Number(q.estimated_gas)<10000000 || Number(q.estimated_gas)>200000000) throw Error('Unsupported gas estimate.');
  if(!/^\d+$/.test(q.fee_amount) || ![WEGLD,BONEZ].includes(q.fee_token) || !/^\d+$/.test(q.estimated_tx_fee_egld)) throw Error('Invalid fee quote.');
  return q;
}
export function minimum(q, slippage) {
  if(![50,100,200].includes(slippage)) throw Error('Unsupported slippage tolerance.');
  const min=BigInt(q.net_amount_out)*BigInt(10000-slippage)/10000n;
  if(min<=0n) throw Error('Amount is too small to protect with minimum output.');
  return min.toString();
}
export function transactionSpec({q,input,amount,slippage,address,created},addressHex,now=Date.now()) {
  if(!Number.isFinite(created)||created>now||now-created>MAX_AGE) throw Error('Quote expired. Get a fresh quote.');
  validateQuote(q,input,amount,addressHex);
  addressHex(address);
  const out=input==='EGLD'?BONEZ:'EGLD';
  const args=[textHex(out),hex(minimum(q,slippage)),q.amounts_and_routes_payload].join('@');
  const data=input==='EGLD'?'aggregate@'+args:'ESDTTransfer@'+textHex(BONEZ)+'@'+hex(amount)+'@'+textHex('aggregate')+'@'+args;
  return {sender:address,receiver:ROUTER,value:input==='EGLD'?amount:'0',gasLimit:Number(q.estimated_gas)+10000000,gasPrice:1000000000,chainID:'1',version:2,data};
}
export function assertSimulation(data) {
  const result=data?.data?.result;
  if(data?.code!=='successful'||!result) throw Error('Swap simulation failed. Get a fresh quote.');
  const shards=result.receiverShard?[result.receiverShard,...(result.senderShard?[result.senderShard]:[])]:[result];
  if(shards.some(s=>s.status!=='success'||s.logs?.events?.some(e=>e.identifier==='signalError'))) throw Error('Swap simulation did not succeed. Get a fresh quote or try a smaller amount.');
  return result;
}
