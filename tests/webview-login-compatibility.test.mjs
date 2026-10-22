import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareWebviewLogin} from '../src/utils/webviewLoginCompatibility.mjs';
test('SDK tokenless webview login can read only the address returned by the wallet',async()=>{
 let result={address:'wallet-approved-address'};
 const strategy={login:async()=>result,getAddress(){throw Error('Method not implemented.');}};
 const provider={getProvider:()=>strategy};
 assert.equal(prepareWebviewLogin(provider),provider);
 await assert.rejects(strategy.getAddress(),/cancelled/);
 await strategy.login();assert.equal(await strategy.getAddress(),'wallet-approved-address');
 result=null;await strategy.login();await assert.rejects(strategy.getAddress(),/cancelled/);
});
test('failed login clears the previous address and keeps the rejection',async()=>{
 let fail=false;const strategy={async login(){if(fail)throw Error('User declined');return {address:'first'};}};
 prepareWebviewLogin({getProvider:()=>strategy});await strategy.login();fail=true;
 await assert.rejects(strategy.login(),/User declined/);await assert.rejects(strategy.getAddress(),/cancelled/);
});
