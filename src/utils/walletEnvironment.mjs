// Capability detection only. A user-agent string or generic iOS `webkit` object
// is not evidence that a signing wallet is present, or that it has authorized us.
export function hasWalletBridge(win=globalThis.window){
 return typeof win?.ReactNativeWebView?.postMessage==='function'||typeof win?.webkit?.messageHandlers?.jsHandler?.postMessage==='function';
}
export function usesDirectWalletConnection(win=globalThis.window){
 return hasWalletBridge(win)||!!win?.matchMedia?.('(max-width: 700px)').matches;
}
export async function loginWithSelectedProvider({create,types,anchor,win=globalThis.window}){
 const embedded=hasWalletBridge(win);
 if(!embedded&&!anchor)throw Error('Wallet connection area is not ready yet.');
 const provider=await create(embedded?{type:types.webview}:{type:types.walletConnect,anchor});
 if(embedded&&!provider.isInitialized())throw Error('xPortal’s browser could not connect to its wallet. Reopen this page in xPortal, or open it in Chrome/Safari and connect there.');
 const result=await provider.login();
 if(!result?.address)throw Error('Wallet connection was cancelled. Please try again.');
 return result;
}
