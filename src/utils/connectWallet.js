import {prepareWebviewLogin} from './webviewLoginCompatibility.mjs';
import {ProviderFactory} from '@multiversx/sdk-dapp/out/providers/ProviderFactory';
import {ProviderTypeEnum} from '@multiversx/sdk-dapp/out/providers/types/providerFactory.types';
import {loginWithSelectedProvider} from './walletEnvironment.mjs';
import {getAccountProvider} from '@multiversx/sdk-dapp/out/providers/helpers/accountProvider';
export {hasWalletBridge,usesDirectWalletConnection} from './walletEnvironment.mjs';
export const loginWithWallet=anchor=>loginWithSelectedProvider({create:async options=>{const provider=await ProviderFactory.create(options);return options.type===ProviderTypeEnum.webview?prepareWebviewLogin(provider):provider;},types:ProviderTypeEnum,anchor});
export const disconnectWallet=()=>getAccountProvider().logout();
