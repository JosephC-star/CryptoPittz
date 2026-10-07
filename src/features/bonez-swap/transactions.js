import { Address } from '@multiversx/sdk-core/out/core/address.js';
import { Transaction } from '@multiversx/sdk-core/out/core/transaction.js';
import { getAccount } from '@multiversx/sdk-dapp/out/methods/account/getAccount';
import { getNetworkConfig } from '@multiversx/sdk-dapp/out/methods/network/getNetworkConfig';
import { getAccountProvider } from '@multiversx/sdk-dapp/out/providers/helpers/accountProvider';
import { TransactionManager } from '@multiversx/sdk-dapp/out/managers/TransactionManager/TransactionManager';
import { BONEZ, transactionSpec, validateQuote, assertSimulation } from './validation.js';
export function addressHex(address){return Array.from(Address.newFromBech32(address).getPublicKey(),b=>b.toString(16).padStart(2,'0')).join('');}
export function verifyQuote(q,input,amount){return validateQuote(q,input,amount,addressHex);}
export async function getJson(url,signal,allowMissing=false){
  const response=await fetch(url,{signal:signal||AbortSignal.timeout(15000),cache:'no-store'});
  if(allowMissing&&response.status===404)return null;
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'Network request failed. Please try again.');
  return data;
}
function context(address){
  const current=getAccount().address;
  if(!current||address&&current!==address)throw Error('Wallet changed. Connect and get a fresh quote.');
  if(getNetworkConfig().network.chainId!=='1')throw Error('Connect a mainnet wallet.');
  return current;
}
export function buildTransaction(spec,nonce){
  return new Transaction({sender:Address.newFromBech32(spec.sender),receiver:Address.newFromBech32(spec.receiver),nonce:BigInt(nonce),value:BigInt(spec.value),gasLimit:BigInt(spec.gasLimit),gasPrice:BigInt(spec.gasPrice),chainID:spec.chainID,version:spec.version,data:new TextEncoder().encode(spec.data)});
}
export function checkTransaction(tx,spec){
  const p=tx.toSendable();
  const expected={...spec,data:btoa(spec.data)};
  for(const [key,value] of Object.entries(expected))if(p[key]!==value)throw Error('Transaction verification failed: '+key+'.');
  if(p.guardian||p.relayer||p.options||p.senderUsername||p.receiverUsername)throw Error('Unsupported transaction configuration.');
  return p;
}
async function checkFunds(address,review){
  const account=await getJson(`https://api.multiversx.com/accounts/${address}`);
  if(!Number.isSafeInteger(account.nonce))throw Error('Unable to verify wallet nonce.');
  if(account.isGuarded)throw Error('Guarded wallets are not supported for this swap yet.');
  const feeCap=BigInt(review.spec.gasLimit)*BigInt(review.spec.gasPrice);
  if(BigInt(account.balance)<BigInt(review.spec.value)+feeCap)throw Error('Insufficient EGLD for the swap and its maximum network fee.');
  if(review.input==='BONEZ'){
    const token=await getJson(`https://api.multiversx.com/accounts/${address}/tokens/${BONEZ}`,undefined,true);
    if(BigInt(token?.balance||'0')<BigInt(review.amount))throw Error('Insufficient BONEZ balance.');
  }
  return account;
}
export async function simulate(tx){
  const payload={...tx.toSendable(),signature:'0'.repeat(128)};
  const r=await fetch('https://api.multiversx.com/transaction/simulate?checkSignature=false',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
  const data=await r.json();
  if(!r.ok)throw Error('Swap simulation is unavailable. Please try again.');
  return assertSimulation(data);
}
export async function reviewSwap(quote){
  const address=context();
  const spec=transactionSpec({...quote,address},addressHex);
  const result={...quote,address,spec,feeCap:(BigInt(spec.gasLimit)*BigInt(spec.gasPrice)).toString()};
  const account=await checkFunds(address,result);
  const tx=buildTransaction(spec,account.nonce);checkTransaction(tx,spec);
  await simulate(tx);context(address);
  transactionSpec(result,addressHex);
  return result;
}
let inFlight=false;
export async function submitSwap(review){
  if(inFlight)throw Error('Another swap is already in progress.');
  inFlight=true;let broadcastStarted=false;
  try{
    context(review.address);
    const spec=transactionSpec(review,addressHex);
    if(JSON.stringify(spec)!==JSON.stringify(review.spec))throw Error('Swap review changed. Get a fresh quote.');
    const account=await checkFunds(review.address,review);
    const tx=buildTransaction(spec,account.nonce);checkTransaction(tx,spec);
    // Only the user initiates signing. Quote freshness is checked immediately before opening their wallet.
    transactionSpec(review,addressHex);
    const signed=await getAccountProvider().signTransactions([tx]);
    if(signed?.length!==1)throw Error('Signing was cancelled.');
    checkTransaction(signed[0],spec);context(review.address);
    // Allow time in xPortal after signing began; the signed minimum output still protects execution.
    if(Date.now()-review.created>180000)throw Error('Signing took too long. Get a fresh quote.');
    const latest=await checkFunds(review.address,review);
    if(BigInt(latest.nonce)!==signed[0].nonce)throw Error('Wallet nonce changed. Get a fresh quote.');
    context(review.address);
    const manager=TransactionManager.getInstance();broadcastStarted=true;
    const sent=await manager.send(signed);
    try{await manager.track(sent);}catch{/* Already sent. Never repeat a broadcast because tracking failed. */}
    const hash=sent?.[0]?.hash;
    return {hash:typeof hash==='string'&&/^[a-f0-9]{64}$/.test(hash)?hash:null};
  }catch(error){
    if(broadcastStarted)throw Error('Submission status is uncertain. Check your wallet transaction history before making another swap.');
    throw error;
  }finally{inFlight=false;}
}
