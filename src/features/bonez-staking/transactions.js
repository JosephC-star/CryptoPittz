import { getAccount } from '@multiversx/sdk-dapp/out/methods/account/getAccount';
import { getNetworkConfig } from '@multiversx/sdk-dapp/out/methods/network/getNetworkConfig';
import { getAccountProvider } from '@multiversx/sdk-dapp/out/providers/helpers/accountProvider';
import { TransactionManager } from '@multiversx/sdk-dapp/out/managers/TransactionManager/TransactionManager';
import { addressHex,getJson,buildTransaction,checkTransaction,simulate } from '../bonez-swap/transactions.js';
import { guardianForAccount,withGuardian,assertGuardianUnchanged } from '../bonez-swap/guarded.js';
import { TOKEN,validateStaking,stakingSpec,assertStakingAction } from './validation.js';
export async function fetchStaking(address){return validateStaking((await getJson('/.netlify/functions/bonez-staking'+(address?'?user='+addressHex(address):''))).pool);}
function context(expected){const a=getAccount().address;if(!a||expected&&a!==expected)throw Error('Wallet changed. Connect and review again.');if(getNetworkConfig().network.chainId!=='1')throw Error('Connect a mainnet wallet.');return a;}
export async function fetchStakingBalances(address){
 const [account,token]=await Promise.all([getJson(`https://api.multiversx.com/accounts/${address}?withGuardianInfo=true`),getJson(`https://api.multiversx.com/accounts/${address}/tokens/${TOKEN}`,undefined,true)]);
 return {account,bonez:token?.balance||'0'};
}
async function checks(address,action,amount,guardian,epochs){
 const [balances,pool]=await Promise.all([fetchStakingBalances(address),fetchStaking(address)]);
 assertGuardianUnchanged(balances.account,guardian,addressHex);assertStakingAction(pool,balances,action,amount);
 if(pool.unbondEpochs!==epochs)throw Error('Withdrawal terms changed. Review again.');
 if(!Number.isSafeInteger(balances.account.nonce))throw Error('Unable to verify wallet nonce.');
 const spec=withGuardian(stakingSpec(address,action,amount),guardian);
 if(BigInt(balances.account.balance)<BigInt(spec.gasLimit)*BigInt(spec.gasPrice))throw Error('Leave enough EGLD for the maximum network fee.');
 return balances;
}
let pendingHash=null;
async function previousTransaction(){
 if(!pendingHash)return;
 let tx;try{tx=await getJson(`https://api.multiversx.com/transactions/${pendingHash}`);}catch{throw Error('Your previous staking transaction is still being indexed. Check wallet history and wait for confirmation.');}
 if(!['success','fail','invalid'].includes(tx.status))throw Error('Wait for your previous staking transaction to finish before another action.');
 pendingHash=null;
}
export async function prepareStaking(action,amount){
 if(submissionUncertain)throw Error('Check the previous staking transaction in wallet history, then reload before trying again.');
 await previousTransaction();
 const address=context(),[pool,balances]=await Promise.all([fetchStaking(address),fetchStakingBalances(address)]);
 assertStakingAction(pool,balances,action,amount);
 const guardian=guardianForAccount(balances.account,addressHex),b=await checks(address,action,amount,guardian,pool.unbondEpochs),spec=withGuardian(stakingSpec(address,action,amount),guardian);
 const tx=buildTransaction(spec,b.account.nonce);checkTransaction(tx,spec);await simulate(tx);context(address);
 return {address,action,amount,unbondEpochs:pool.unbondEpochs,spec,guardian,created:Date.now(),feeCap:(BigInt(spec.gasLimit)*BigInt(spec.gasPrice)).toString()};
}
let inFlight=false,submissionUncertain=false;
export async function submitStaking(review){
 if(submissionUncertain)throw Error('Check the previous staking transaction in your wallet history, then reload before trying again.');
 if(inFlight)throw Error('Another staking transaction is in progress.');
 inFlight=true;let broadcast=false;
 try{
  await previousTransaction();context(review.address);if(Date.now()-review.created>60000)throw Error('Review expired. Review again.');
  const spec=withGuardian(stakingSpec(review.address,review.action,review.amount),review.guardian);
  if(JSON.stringify(spec)!==JSON.stringify(review.spec))throw Error('Review changed. Review again.');
  const b=await checks(review.address,review.action,review.amount,review.guardian,review.unbondEpochs),tx=buildTransaction(spec,b.account.nonce);checkTransaction(tx,spec);
  await simulate(tx);context(review.address);
  if(Date.now()-review.created>60000)throw Error('Review expired. Review again.');
  const signed=await getAccountProvider().signTransactions([tx]);if(signed?.length!==1)throw Error('Signing was cancelled.');
  checkTransaction(signed[0],spec,true);context(review.address);
  if(Date.now()-review.created>240000)throw Error('Signing took too long. Review again.');
  const latest=await checks(review.address,review.action,review.amount,review.guardian,review.unbondEpochs);
  if(BigInt(latest.account.nonce)!==signed[0].nonce)throw Error('Wallet nonce changed. Review again.');
  const manager=TransactionManager.getInstance();broadcast=true;const sent=await manager.send(signed);
  try{await manager.track(sent);}catch{/* A tracking failure must not repeat the transaction. */}
  const hash=sent?.[0]?.hash;pendingHash=typeof hash==='string'&&/^[a-f0-9]{64}$/.test(hash)?hash:null;if(!pendingHash)submissionUncertain=true;return {hash:pendingHash};
 }catch(e){if(broadcast){submissionUncertain=true;throw Error('Submission status is uncertain. Check wallet history before trying again.');}throw e;}finally{inFlight=false;}
}
