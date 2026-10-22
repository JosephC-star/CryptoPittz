import test from 'node:test';
import assert from 'node:assert/strict';
import {hasWalletBridge,usesDirectWalletConnection,loginWithSelectedProvider} from '../src/utils/walletEnvironment.mjs';
const types={webview:'webview',walletConnect:'walletConnect'};
const mobile={matchMedia:()=>({matches:true})},desktop={matchMedia:()=>({matches:false})};
const android={...desktop,ReactNativeWebView:{postMessage(){}}},ios={...desktop,webkit:{messageHandlers:{jsHandler:{postMessage(){}}}}};
test('embedded detection uses actual bridge capability, including desktop-view xPortal',()=>{
 assert.equal(hasWalletBridge(android),true);assert.equal(hasWalletBridge(ios),true);assert.equal(usesDirectWalletConnection(android),true);
 assert.equal(hasWalletBridge({...mobile,webkit:{}}),false);assert.equal(hasWalletBridge({...desktop,navigator:{userAgent:'xPortal'}}),false);assert.equal(hasWalletBridge({ReactNativeWebView:{}}),false);
 assert.equal(usesDirectWalletConnection(mobile),true);assert.equal(usesDirectWalletConnection(desktop),false);
});
test('embedded wallets retry native handshake/login without WalletConnect or a QR anchor',async()=>{
 for(const win of [android,ios]){let logins=0;const result=await loginWithSelectedProvider({types,win,create:async options=>{assert.deepEqual(options,{type:'webview'});return {isInitialized:()=>true,login:async()=>{logins++;return {address:'wallet-from-provider'}}};}});assert.equal(logins,1);assert.equal(result.address,'wallet-from-provider');}
});
test('mobile browser keeps WalletConnect and requires its visible anchor',async()=>{
 const anchor={};await loginWithSelectedProvider({types,win:mobile,anchor,create:async options=>{assert.deepEqual(options,{type:'walletConnect',anchor});return {login:async()=>({address:'wallet-from-provider'})};}});
 await assert.rejects(loginWithSelectedProvider({types,win:mobile,create:async()=>{throw Error('Must not run');}}),/area is not ready/);
});
test('failed native handshake never loops back into WalletConnect or reports success',async()=>{
 let logins=0;await assert.rejects(loginWithSelectedProvider({types,win:android,create:async()=>({isInitialized:()=>false,login:async()=>{logins++;}})}),/Reopen this page/);assert.equal(logins,0);
});
test('cancelled or rejected wallet login is not treated as a connected session',async()=>{
 await assert.rejects(loginWithSelectedProvider({types,win:android,create:async()=>({isInitialized:()=>true,login:async()=>null})}),/cancelled/);
 await assert.rejects(loginWithSelectedProvider({types,win:android,create:async()=>({isInitialized:()=>true,login:async()=>{throw Error('User declined');}})}),/User declined/);
});
