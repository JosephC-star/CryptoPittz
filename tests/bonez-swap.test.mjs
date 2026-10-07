import test from 'node:test';
import assert from 'node:assert/strict';
import {BONEZ,WEGLD,ROUTER,atomic,human,hex,textHex,validateQuote,minimum,transactionSpec,assertSimulation} from '../src/features/bonez-swap/validation.js';
const contract='contract', sender='sender';
const addressHex=a=>{assert.ok([contract,sender].includes(a));return '00000000000000000500'+'01'.repeat(22);};
function fixture(input='EGLD'){
 const tokenIn=input==='EGLD'?WEGLD:BONEZ,tokenOut=input==='EGLD'?BONEZ:WEGLD;
 const nested=s=>(s.length).toString(16).padStart(8,'0')+textHex(s);
 const payload=nested(tokenIn)+'00000001'+addressHex(contract)+'06'+nested(tokenOut);
 return {amount_in:'1000000',net_amount_out:'500000',estimated_gas:'75000000',fee_amount:'500',fee_token:WEGLD,estimated_tx_fee_egld:'1000000000000000',route:{token_in:tokenIn,token_out:tokenOut,hops:[{token_in:tokenIn,token_out:tokenOut,pool:{sc_address:contract,type:'jexchange_lp',tokens_in:[tokenIn],tokens_out:[tokenOut]}}]},route_payload:payload,amounts_and_routes_payload:hex('1000000')+'@'+payload};
}
test('amounts stay exact above floating point precision and respect token decimals',()=>{
 assert.equal(atomic('9007199254740993.000001',6),'9007199254740993000001');
 assert.equal(human('10000000000000000',18),'0.01');assert.equal(human('1000000',6),'1');
 for(const s of ['0','-1','1e3','NaN','Infinity','1.0000001'])assert.throws(()=>atomic(s,6));
});
for(const input of ['EGLD','BONEZ'])test(input+' produces exact payment, recipient, minimum and route',()=>{
 const q=fixture(input);assert.equal(validateQuote(q,input,'1000000',addressHex),q);
 const tx=transactionSpec({q,input,amount:'1000000',slippage:50,address:sender,created:1000},addressHex,1001);
 assert.equal(tx.receiver,ROUTER);assert.equal(tx.value,input==='EGLD'?'1000000':'0');assert.equal(tx.gasLimit,85000000);
 const args=textHex(input==='EGLD'?BONEZ:'EGLD')+'@'+hex('497500')+'@'+q.amounts_and_routes_payload;
 assert.equal(tx.data,input==='EGLD'?'aggregate@'+args:'ESDTTransfer@'+textHex(BONEZ)+'@'+hex('1000000')+'@'+textHex('aggregate')+'@'+args);
});
for(const [name,mutate] of Object.entries({amount:q=>q.amount_in='1000001',output:q=>q.route.token_out='MEX-455c57',route:q=>q.route_payload+='00',payload:q=>q.amounts_and_routes_payload='01@'+q.route_payload,pool:q=>q.route.hops[0].pool.type='unknown',hop:q=>q.route.hops[0].token_in='MEX-455c57',gas:q=>q.estimated_gas='999999999',negative:q=>q.net_amount_out='-1',fee:q=>q.fee_token='BAD-token'}))test('reject tampered '+name,()=>{const q=fixture();mutate(q);assert.throws(()=>validateQuote(q,'EGLD','1000000',addressHex));});
test('reject expired reviews and unsupported slippage',()=>{
 const review={q:fixture(),input:'EGLD',amount:'1000000',slippage:50,address:sender,created:1000};
 assert.throws(()=>transactionSpec(review,addressHex,31001));assert.throws(()=>transactionSpec({...review,created:5000},addressHex,1000));assert.throws(()=>minimum(review.q,10000));
});

test('simulation accepts successful shard format and rejects any failed shard or contract error',()=>{
 const ok={code:'successful',data:{result:{receiverShard:{status:'success'},senderShard:{status:'success'}}}};
 assert.equal(assertSimulation(ok),ok.data.result);
 assert.throws(()=>assertSimulation({code:'successful',data:{result:{receiverShard:{status:'fail'},senderShard:{status:'success'}}}}));
 assert.throws(()=>assertSimulation({code:'successful',data:{result:{status:'success',logs:{events:[{identifier:'signalError'}]}}}}));
 assert.throws(()=>assertSimulation({code:'successful',data:{result:{}}}));
});

import {fetchSwapQuote} from '../src/features/bonez-swap/quote.js';
test('quote service fallback keeps exact token direction and amount, without broadcasting',async()=>{
 const calls=[];
 const q=fixture('BONEZ');
 const result=await fetchSwapQuote('BONEZ','1000000',async url=>{
   calls.push(url);
   return calls.length===1?{ok:false,json:async()=>({error:'temporary'})}:{ok:true,json:async()=>({static:q})};
 });
 assert.equal(result,q);assert.equal(calls.length,2);
 const request=new URL(calls[1]);assert.equal(request.origin,'https://agg-api.jexchange.io');assert.equal(request.pathname,'/evaluate');
 assert.equal(request.searchParams.get('token_in'),BONEZ);assert.equal(request.searchParams.get('token_out'),WEGLD);assert.equal(request.searchParams.get('amount_in'),'1000000');
});
