import {transactionState} from '../../utils/transactionState.mjs';
import { getAccount } from '@multiversx/sdk-dapp/out/methods/account/getAccount';
import { getNetworkConfig } from '@multiversx/sdk-dapp/out/methods/network/getNetworkConfig';
import { getAccountProvider } from '@multiversx/sdk-dapp/out/providers/helpers/accountProvider';
import { TransactionManager } from '@multiversx/sdk-dapp/out/managers/TransactionManager/TransactionManager';
import { addressHex,getJson,buildTransaction,checkTransaction,simulate } from '../bonez-swap/transactions.js';
import { guardianForAccount,withGuardian,assertGuardianUnchanged } from '../bonez-swap/guarded.js';
import { waitForWallet } from './walletResponse.js';
import { FIRST,SECOND,LP,validatePool,liquidityQuote,liquiditySpec,assertCurrentRatio,withdrawalQuote,withdrawalSpec,assertWithdrawalRatio } from './validation.js';
export async function fetchPool(){return validatePool((await getJson('/.netlify/functions/bonez-pool')).pool);}
function context(expected){const a=getAccount().address;if(!a||expected&&a!==expected)throw Error('Connect your wallet and get a fresh liquidity quote.');if(getNetworkConfig().network.chainId!=='1')throw Error('Connect a mainnet wallet.');return a;}
export async function fetchLiquidityBalances(address){
 const [account,...tokens]=await Promise.all([getJson(`https://api.multiversx.com/accounts/${address}?withGuardianInfo=true`),...[FIRST,SECOND,LP].map(id=>getJson(`https://api.multiversx.com/accounts/${address}/tokens/${id}`,undefined,true))]);
 return {account,bonez:tokens[0]?.balance||'0',wegld:tokens[1]?.balance||'0',lp:tokens[2]?.balance||'0'};
}
const specFor=(action,address,terms)=>action==='withdraw'?withdrawalSpec(address,terms,addressHex):liquiditySpec(address,terms,addressHex);
const checkRatio=(action,pool,terms)=>action==='withdraw'?assertWithdrawalRatio(pool,terms):assertCurrentRatio(pool,terms);
async function funds(address,terms,guardian,action){
 const b=await fetchLiquidityBalances(address);assertGuardianUnchanged(b.account,guardian,addressHex);
 if(!Number.isSafeInteger(b.account.nonce))throw Error('Unable to verify wallet nonce.');
 const spec=withGuardian(specFor(action,address,terms),guardian);
 if(BigInt(b.account.balance)<BigInt(spec.gasLimit)*BigInt(spec.gasPrice))throw Error('Leave enough EGLD for the maximum network fee.');
 if(action==='withdraw'&&BigInt(b.lp)<BigInt(terms.lp))throw Error('Not enough available LP tokens in your wallet.');
 if(action!=='withdraw'&&(BigInt(b.bonez)<BigInt(terms.first)||BigInt(b.wegld)<BigInt(terms.second)))throw Error('You need both BONEZ and WEGLD for this deposit. Native EGLD is reserved for network fees.');
 return b;
}
export async function prepareLiquidity(pool,amount,slippage,action='deposit'){
 if(!['deposit','withdraw'].includes(action))throw Error('Invalid liquidity action.');
 await assertNoPending();
 const address=context(),fresh=await fetchPool();
 const terms=action==='withdraw'?withdrawalQuote(pool,amount,slippage):liquidityQuote(pool,amount,slippage);checkRatio(action,fresh,terms);
 const {account}=await fetchLiquidityBalances(address),guardian=guardianForAccount(account,addressHex);
 const b=await funds(address,terms,guardian,action),spec=withGuardian(specFor(action,address,terms),guardian);
 const tx=buildTransaction(spec,b.account.nonce);checkTransaction(tx,spec);await simulate(tx);context(address);
 return {action,address,terms,spec,guardian,created:Date.now(),feeCap:(BigInt(spec.gasLimit)*BigInt(spec.gasPrice)).toString()};
}
let inFlight=false,submissionUncertain=false,pendingHash=null;
async function assertNoPending(){
 if(submissionUncertain)throw Error('Check the previous liquidity transaction in your wallet history before reloading and trying again.');
 if(!pendingHash)return;
 const previous=await getJson(`https://api.multiversx.com/transactions/${pendingHash}`);
 if(transactionState(previous)==='pending')throw Error('Wait for your previous liquidity transaction to finish.');
 pendingHash=null;
}
export async function submitLiquidity(review,onProgress=()=>{}){
 if(submissionUncertain)throw Error('Check the previous liquidity transaction in your wallet history, then reload this page before trying again.');
 if(inFlight)throw Error('Another liquidity transaction is in progress.');
 inFlight=true;let broadcast=false;
 try{
  await assertNoPending();
  const action=review.action||'deposit';
  if(!['deposit','withdraw'].includes(action))throw Error('Invalid liquidity action.');
  context(review.address);if(Date.now()-review.created>60000)throw Error('Liquidity review expired. Get a fresh quote.');
  const spec=withGuardian(specFor(action,review.address,review.terms),review.guardian);
  if(JSON.stringify(spec)!==JSON.stringify(review.spec))throw Error('Liquidity review changed. Get a fresh quote.');
  const fresh=await fetchPool();checkRatio(action,fresh,review.terms);
  const b=await funds(review.address,review.terms,review.guardian,action),tx=buildTransaction(spec,b.account.nonce);checkTransaction(tx,spec);
  await simulate(tx);context(review.address);
  if(Date.now()-review.created>60000)throw Error('Liquidity review expired. Get a fresh quote.');
  onProgress('Waiting for xPortal’s signed response. Approve the liquidity transaction in your wallet.');
  const provider=getAccountProvider();
  const signed=await waitForWallet(()=>provider.signTransactions([tx]),{onTimeout:()=>provider.getProvider?.()?.cancelAction?.()});if(signed?.length!==1)throw Error('Signing was cancelled.');
  onProgress('Wallet approval received. Verifying the signed liquidity transaction…');
  checkTransaction(signed[0],spec,true);context(review.address);
  if(Date.now()-review.created>240000)throw Error('Signing took too long. Get a fresh liquidity quote.');
  const latest=await funds(review.address,review.terms,review.guardian,action);checkRatio(action,await fetchPool(),review.terms);
  if(BigInt(latest.account.nonce)!==signed[0].nonce)throw Error('Wallet nonce changed. Get a fresh quote.');
  onProgress('Sending the approved liquidity transaction to MultiversX…');
  const manager=TransactionManager.getInstance();broadcast=true;const sent=await manager.send(signed);
  const hash=sent?.[0]?.hash,validHash=typeof hash==='string'&&/^[a-f0-9]{64}$/.test(hash)?hash:null;
  if(!validHash)submissionUncertain=true;else pendingHash=validHash;
  void manager.track(sent).catch(()=>{});
  return {hash:validHash};
 }catch(e){if(broadcast){submissionUncertain=true;throw Error('Submission status is uncertain. Check your wallet history before making another liquidity transaction.');}throw e;}finally{inFlight=false;}
}
