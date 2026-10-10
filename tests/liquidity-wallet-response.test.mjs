import test from 'node:test';
import assert from 'node:assert/strict';
import {waitForWallet} from '../src/features/bonez-liquidity/walletResponse.js';
test('Wallet approval returns to the deposit flow',async()=>{const result=await waitForWallet(()=>Promise.resolve(['signed']),{timeoutMs:100});assert.deepEqual(result,['signed']);});
test('Wallet rejection preserves the error',async()=>{await assert.rejects(waitForWallet(()=>Promise.reject(Error('User cancelled')),{timeoutMs:100}),/User cancelled/);});
test('Missing wallet response times out and cancels the outstanding request',async()=>{let cancelled=false;await assert.rejects(waitForWallet(()=>new Promise(()=>{}),{timeoutMs:5,onTimeout:()=>{cancelled=true;}}),/not submitted/);assert.equal(cancelled,true);});
test('A late signature cannot continue to broadcast after timeout',async()=>{let resolve,submitted=false;const wallet=new Promise(r=>{resolve=r;});const flow=waitForWallet(()=>wallet,{timeoutMs:5}).then(()=>{submitted=true;});await assert.rejects(flow,/not submitted/);resolve(['late signature']);await new Promise(r=>setTimeout(r,5));assert.equal(submitted,false);});
