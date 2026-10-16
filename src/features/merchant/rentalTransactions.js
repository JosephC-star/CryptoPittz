import {RENTAL_TEST_POLICY,rentalTestAllowed} from '../../../shared/market-rental-test.mjs';
import {TransactionComputer} from '@multiversx/sdk-core/out/core/transactionComputer.js';
import {getAccount} from '@multiversx/sdk-dapp/out/methods/account/getAccount';
import {getNetworkConfig} from '@multiversx/sdk-dapp/out/methods/network/getNetworkConfig';
import {getAccountProvider} from '@multiversx/sdk-dapp/out/providers/helpers/accountProvider';
import {TransactionManager} from '@multiversx/sdk-dapp/out/managers/TransactionManager/TransactionManager';
import {addressHex,getJson,buildTransaction,checkTransaction} from '../bonez-swap/transactions.js';
import {guardianForAccount,withGuardian,assertGuardianUnchanged} from '../bonez-swap/guarded.js';
import {contributionSpec,assertContributionSimulation,BURN_PILE_ADDRESS} from '../bonez-burn/contributionValidation.js';
import {validateBurnToken} from '../bonez-burn/amounts.js';
const TOKEN='BONEZ-ff9a73';let inFlight=false;
function context(address){if(getAccount().address!==address||getNetworkConfig().network.chainId!=='1')throw Error('Connect the rental wallet on mainnet.');}
function specFor(review){
 const totals={1:'60000',6:'330000',12:'600000'},base=totals[review.months];
 if(!base||!['standard','meta'].includes(review.tier)||review.recipient!==BURN_PILE_ADDRESS||review.token!==TOKEN||review.decimals!==6)throw Error('Rental payment review could not be verified.');
 const test=review.policyVersion===RENTAL_TEST_POLICY;
 if(test&&(!rentalTestAllowed(review.address,window.location.origin)||review.origin!==window.location.origin||review.months!==1||review.tier!=='standard'))throw Error('This test payment is not available here.');
 if(!test&&review.policyVersion!=='2026-10-15-v1')throw Error('Unknown rental policy.');
 const expected=test?1n:BigInt(base)/(review.tier==='meta'?2n:1n);
 if(String(review.amountBonez)!==expected.toString()||String(review.amountAtomic)!==(expected*1000000n).toString())throw Error('Rental price did not match its plan.');
 return contributionSpec(review.address,review.amountBonez);
}
async function funds(review,guardian,checkGuardian=false){
 context(review.address);
 const [account,balance,token]=await Promise.all([getJson('https://api.multiversx.com/accounts/'+review.address+'?withGuardianInfo=true'),getJson('https://api.multiversx.com/accounts/'+review.address+'/tokens/'+TOKEN,undefined,true),getJson('https://api.multiversx.com/tokens/'+TOKEN)]);
 validateBurnToken(token);if(token.isPaused)throw Error('BONEZ transfers are paused.');
 if(balance&&balance.identifier!==TOKEN)throw Error('BONEZ balance could not be verified.');
 if(BigInt(balance?.balance||'0')<BigInt(review.amountAtomic))throw Error('Not enough liquid BONEZ for this rental.');
 if(!Number.isSafeInteger(account.nonce)||String(account.nonce)!==review.expectedNonce)throw Error('Wallet nonce changed. Cancel the review and get a new rate.');
 if(checkGuardian)assertGuardianUnchanged(account,guardian,addressHex);
 const protection=guardianForAccount(account,addressHex),spec=withGuardian(specFor(review),protection);
 if(BigInt(account.balance)<BigInt(spec.gasLimit)*BigInt(spec.gasPrice))throw Error('Leave enough EGLD for the network fee.');
 return {guardian:protection,spec};
}
async function simulate(tx,spec){
 const payload={...tx.toSendable(),signature:'0'.repeat(128),...(spec.guardian?{guardianSignature:'0'.repeat(128)}:{})};
 const r=await fetch('https://api.multiversx.com/transaction/simulate?checkSignature=false',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('Rental transfer simulation is unavailable. Nothing has been submitted.');
 assertContributionSimulation(await r.json(),spec);
}
export async function prepareRental(review){
 context(review.address);if(Date.now()>review.expiresAt||review.state!=='review'||!review.canPay)throw Error('Get an available current rental review.');
 const f=await funds(review),tx=buildTransaction(f.spec,review.expectedNonce);checkTransaction(tx,f.spec);await simulate(tx,f.spec);context(review.address);
 return {...review,...f};
}
export async function submitRental(prepared,reserve){
 if(inFlight)throw Error('A rental transaction is already in progress.');inFlight=true;let reserved=false;
 try{
  if(Date.now()>prepared.expiresAt)throw Error('Rental review expired.');
  const fresh=await funds(prepared,prepared.guardian,true);if(JSON.stringify(fresh.spec)!==JSON.stringify(prepared.spec))throw Error('Rental transaction changed. Review again.');
  const tx=buildTransaction(fresh.spec,prepared.expectedNonce);checkTransaction(tx,fresh.spec);await simulate(tx,fresh.spec);context(prepared.address);
  const signed=await getAccountProvider().signTransactions([tx]);if(signed?.length!==1)throw Error('Wallet signing was cancelled.');
  checkTransaction(signed[0],fresh.spec,true);if(signed[0].nonce!==BigInt(prepared.expectedNonce))throw Error('Signed nonce changed.');
  await funds(prepared,prepared.guardian,true);await simulate(signed[0],fresh.spec);context(prepared.address);
  if(Date.now()>prepared.expiresAt)throw Error('Signing took too long. The rental was not submitted.');
  const txHash=new TransactionComputer().computeTransactionHash(signed[0]);
  // Save the exact signed hash on the backend BEFORE any broadcast; reloads recover this intent.
  await reserve(txHash);reserved=true;
  const sent=await TransactionManager.getInstance().send(signed);
  if(sent?.[0]?.hash!==txHash)throw Error('Transaction submission could not be confirmed.');
  return txHash;
 }catch(error){if(reserved)throw Error('Submission needs confirmation. Use Check saved payment below; do not send another payment.');throw error;}
 finally{inFlight=false;}
}
