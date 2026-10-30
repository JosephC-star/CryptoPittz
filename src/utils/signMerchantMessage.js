import {getAccountProvider} from '@multiversx/sdk-dapp/out/providers/helpers/accountProvider';
import {Message} from '@multiversx/sdk-dapp/out/lib/sdkCore';
import {hasWalletBridge,loginWithWallet} from './connectWallet';
import {signingProvider,waitForApproval} from './walletApproval.mjs';

export async function signMerchantMessage(address,message){
 const provider=await waitForApproval(()=>signingProvider({address,embedded:hasWalletBridge(),current:getAccountProvider,connect:()=>loginWithWallet()}),()=>getAccountProvider().cancelLogin());
 const signed=await waitForApproval(()=>provider.signMessage(new Message({data:new TextEncoder().encode(message)})),()=>provider.getProvider().cancelAction?.());
 if(!signed?.signature)throw Error('No wallet approval received. Try again and approve the sign-in message inside xPortal. No payment was taken.');
 return typeof signed.signature==='string'?signed.signature.replace(/^0x/,''):Array.from(signed.signature,b=>b.toString(16).padStart(2,'0')).join('');
}
