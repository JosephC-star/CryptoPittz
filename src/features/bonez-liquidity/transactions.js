import { getAccount } from '@multiversx/sdk-dapp/out/methods/account/getAccount';
import { getNetworkConfig } from '@multiversx/sdk-dapp/out/methods/network/getNetworkConfig';
import { getAccountProvider } from '@multiversx/sdk-dapp/out/providers/helpers/accountProvider';
import { TransactionManager } from '@multiversx/sdk-dapp/out/managers/TransactionManager/TransactionManager';
import { addressHex,getJson,buildTransaction,checkTransaction,simulate } from '../bonez-swap/transactions.js';
import { guardianForAccount,withGuardian,assertGuardianUnchanged } from '../bonez-swap/guarded.js';
import { FIRST,SECOND,LP,validatePool,liquidityQuote,liquiditySpec,assertCurrentRatio } from './validation.js';
export async function fetchPool(){return validatePool((await getJson('/.netlify/functions/bonez-pool')).pool);}
function context(expected){const a=getAccount().address;if(!a||expected&&a!==expected)throw Error('Connect your wallet and get a fresh liquidity quote.');if(getNetworkConfig().network.chainId!=='1')throw Error('Connect a mainnet wallet.');return a;}
export async function fetchLiquidityBalances(address){
 const [account,...tokens]=await Promise.all([getJson(`https://api.multiversx.com/accounts/${address}?withGuardianInfo=true`),...[FIRST,SECOND,LP].map(id=>getJson(`https://api.multiversx.com/accounts/${address}/tokens/${id}`,undefined,true))]);
 return {account,bonez:tokens[0]?.balance||'0',wegld:tokens[1]?.balance||'0',lp:tokens[2]?.balance||'0'};
}
async function funds(address,terms,guardian){
 const b=await fetchLiquidityBalances(address);assertGuardianUnchanged(b.account,guardian,addressHex);
 if(!Number.isSafeInteger(b.account.nonce))throw Error('Unable to verify wallet nonce.');
 const spec=withGuardian(liquiditySpec(address,terms,addressHex),guardian);
 if(BigInt(b.account.balance)<BigInt(spec.gasLimit)*BigInt(spec.gasPrice))throw Error('Leave enough EGLD for the maximum network fee.');
 if(BigInt(b.bonez)<BigInt(terms.first)||BigInt(b.wegld)<BigInt(terms.second))throw Error('You need both BONEZ and WEGLD for this deposit. Native EGLD is reserved for network fees.');
 return b;
}
export async function prepareLiquidity(pool,amount,slippage){
 const address=context(),fresh=await fetchPool();
 const terms=liquidityQuote(pool,amount,slippage);assertCurrentRatio(fresh,terms);
 const {account}=await fetchLiquidityBalances(address),guardian=guardianForAccount(account,addressHex);
 const b=await funds(address,terms,guardian),spec=withGuardian(liquiditySpec(address,terms,addressHex),guardian);
 const tx=buildTransaction(spec,b.account.nonce);checkTransaction(tx,spec);await simulate(tx);context(address);
 return {address,terms,spec,guardian,created:Date.now(),feeCap:(BigInt(spec.gasLimit)*BigInt(spec.gasPrice)).toString()};
}
let inFlight=false,submissionUncertain=false;
export async function submitLiquidity(review){
 if(submissionUncertain)throw Error('Check the previous deposit in your wallet history, then reload this page before trying again.');
 if(inFlight)throw Error('Another liquidity deposit is in progress.');
 inFlight=true;let broadcast=false;
 try{
  context(review.address);if(Date.now()-review.created>60000)throw Error('Liquidity review expired. Get a fresh quote.');
  const spec=withGuardian(liquiditySpec(review.address,review.terms,addressHex),review.guardian);
  if(JSON.stringify(spec)!==JSON.stringify(review.spec))throw Error('Liquidity review changed. Get a fresh quote.');
  const fresh=await fetchPool();assertCurrentRatio(fresh,review.terms);
  const b=await funds(review.address,review.terms,review.guardian),tx=buildTransaction(spec,b.account.nonce);checkTransaction(tx,spec);
  await simulate(tx);context(review.address);
  if(Date.now()-review.created>60000)throw Error('Liquidity review expired. Get a fresh quote.');
  const signed=await getAccountProvider().signTransactions([tx]);if(signed?.length!==1)throw Error('Signing was cancelled.');
  checkTransaction(signed[0],spec,true);context(review.address);
  if(Date.now()-review.created>240000)throw Error('Signing took too long. Get a fresh liquidity quote.');
  const latest=await funds(review.address,review.terms,review.guardian);assertCurrentRatio(await fetchPool(),review.terms);
  if(BigInt(latest.account.nonce)!==signed[0].nonce)throw Error('Wallet nonce changed. Get a fresh quote.');
  const manager=TransactionManager.getInstance();broadcast=true;const sent=await manager.send(signed);
  try{await manager.track(sent);}catch{/* Never repeat a sent deposit because tracking failed. */}
  const hash=sent?.[0]?.hash;return {hash:typeof hash==='string'&&/^[a-f0-9]{64}$/.test(hash)?hash:null};
 }catch(e){if(broadcast){submissionUncertain=true;throw Error('Submission status is uncertain. Check your wallet history before making another deposit.');}throw e;}finally{inFlight=false;}
}
