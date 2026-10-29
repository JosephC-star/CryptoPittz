import {TransactionComputer} from '@multiversx/sdk-core';
import {getAccount} from '@multiversx/sdk-dapp/out/methods/account/getAccount';
import {getNetworkConfig} from '@multiversx/sdk-dapp/out/methods/network/getNetworkConfig';
import {getAccountProvider} from '@multiversx/sdk-dapp/out/providers/helpers/accountProvider';
import {TransactionManager} from '@multiversx/sdk-dapp/out/managers/TransactionManager/TransactionManager';
import {addressHex,getJson,buildTransaction,checkTransaction} from '../bonez-swap/transactions';
import {guardianForAccount,withGuardian,assertGuardianUnchanged} from '../bonez-swap/guarded';
import {transferSpec} from './transfer.mjs';
export const pendingKey=a=>'pittz-send-pending-'+a;
function context(address){if(getAccount().address!==address||getNetworkConfig().network.chainId!=='1')throw Error('Wallet or network changed. Review again.');}
async function fresh(review){
 context(review.address);
 const [account,nft]=await Promise.all([getJson('https://api.multiversx.com/accounts/'+review.address+'?withGuardianInfo=true'),getJson('https://api.multiversx.com/accounts/'+review.address+'/nfts/'+review.identifier)]);
 if(nft.identifier!==review.identifier||nft.type!=='NonFungibleESDT'||(nft.balance&&nft.balance!=='1'))throw Error('This Pittz is no longer in your wallet. Unlist it before sending.');
 const guardian=guardianForAccount(account,addressHex);if(Object.hasOwn(review,'guardian'))assertGuardianUnchanged(account,review.guardian,addressHex);
 const spec=withGuardian(transferSpec(review.address,review.recipient,review.identifier),guardian);
 if(!Number.isSafeInteger(account.nonce)||BigInt(account.balance)<BigInt(spec.gasLimit)*BigInt(spec.gasPrice))throw Error('Insufficient EGLD for the network fee, or wallet data unavailable.');
 return {account,guardian,spec};
}
export async function prepareTransfer(address,recipient,identifier){const review={address,recipient:recipient.trim(),identifier,created:Date.now()};const f=await fresh(review);return {...review,guardian:f.guardian,feeCap:(BigInt(f.spec.gasLimit)*BigInt(f.spec.gasPrice)).toString()};}
let busy=false;
export async function submitTransfer(review){
 if(import.meta.env.VITE_OOX_TRANSACTIONS!=='true')throw Error('Sending is disabled in this preview.');
 if(busy||localStorage.getItem(pendingKey(review.address)))throw Error('Check your previous transfer before sending another.');busy=true;let broadcast=false;
 try{
 if(Date.now()-review.created>120000||review.created>Date.now())throw Error('Review expired. Review again.');
 const f=await fresh(review),tx=buildTransaction(f.spec,f.account.nonce);checkTransaction(tx,f.spec);
 const signed=await getAccountProvider().signTransactions([tx]);if(signed?.length!==1)throw Error('Signing cancelled.');checkTransaction(signed[0],f.spec,true);
 const latest=await fresh(review);if(signed[0].nonce!==BigInt(latest.account.nonce)||Date.now()-review.created>240000)throw Error('Wallet changed or review expired. Review again.');context(review.address);
 const hash=new TransactionComputer().computeTransactionHash(signed[0]);if(!/^[a-f0-9]{64}$/.test(hash))throw Error('Invalid transaction hash.');
 localStorage.setItem(pendingKey(review.address),JSON.stringify({hash,...review}));broadcast=true;
 const manager=TransactionManager.getInstance(),sent=await manager.send(signed);try{await manager.track(sent);}catch{}return hash;
 }catch(e){if(broadcast)throw Error('Submission uncertain. Check the saved transaction; do not resend.');throw e;}finally{busy=false;}
}
