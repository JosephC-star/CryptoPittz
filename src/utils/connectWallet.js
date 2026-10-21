import {ProviderFactory} from '@multiversx/sdk-dapp/out/providers/ProviderFactory';
import {ProviderTypeEnum} from '@multiversx/sdk-dapp/out/providers/types/providerFactory.types';
import {loginWithSelectedProvider} from './walletEnvironment.mjs';
export {hasWalletBridge,usesDirectWalletConnection} from './walletEnvironment.mjs';
export const loginWithWallet=anchor=>loginWithSelectedProvider({create:options=>ProviderFactory.create(options),types:ProviderTypeEnum,anchor});
