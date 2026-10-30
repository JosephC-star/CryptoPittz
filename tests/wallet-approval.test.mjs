import test from 'node:test';
import assert from 'node:assert/strict';
import {signingProvider,waitForApproval} from '../src/utils/walletApproval.mjs';

test('an embedded wallet reconnects before signing even when an address was restored',async()=>{
 let reconnected=false;
 const ready={isInitialized:()=>true};
 const provider=await signingProvider({address:'approved-wallet',embedded:true,connect:async()=>{reconnected=true;return {address:'approved-wallet'};},current:()=>{assert.equal(reconnected,true);return ready;}});
 assert.equal(provider,ready);
});
test('a changed native wallet cannot sign the previous wallet challenge',async()=>{
 await assert.rejects(signingProvider({address:'old-wallet',embedded:true,connect:async()=>({address:'other-wallet'}),current:()=>{throw Error('Must not sign');}}),/wallet changed/);
});
test('external wallets preserve their provider but expired connections fail clearly',async()=>{
 const provider={isInitialized:()=>true};
 assert.equal(await signingProvider({address:'wallet',embedded:false,current:()=>provider,connect:()=>{throw Error('Must not reconnect');}}),provider);
 await assert.rejects(signingProvider({address:'wallet',embedded:false,current:()=>({isInitialized:()=>false})}),/connection expired/);
});
test('a stalled approval cancels and reports a retry instead of waiting forever',async()=>{
 let cancelled=0;
 await assert.rejects(waitForApproval(()=>new Promise(()=>{}),()=>{cancelled++;},{timeoutMs:10}),/approval timed out/);
 assert.equal(cancelled,1);
});
test('completed and rejected approvals preserve the wallet response',async()=>{
 assert.equal(await waitForApproval(async()=>'signature'), 'signature');
 await assert.rejects(waitForApproval(async()=>{throw Error('User rejected');}),/User rejected/);
});
