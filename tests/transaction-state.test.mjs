import test from 'node:test';
import assert from 'node:assert/strict';
import {transactionState} from '../src/utils/transactionState.mjs';
test('a successful carrier is still pending while cross-shard results are outstanding',()=>{assert.equal(transactionState({status:'success',pendingResults:true}),'pending');assert.equal(transactionState({status:'success',pendingResults:false}),'confirmed');assert.equal(transactionState({status:'success'}),'confirmed');});
test('failed and invalid receipts are terminal, while missing or indexing receipts remain pending',()=>{for(const status of ['fail','invalid'])assert.equal(transactionState({status}),'failed');for(const tx of [null,undefined,{}, {status:'pending'},{status:'received'},{status:'executing'},{status:'not-executed'}])assert.equal(transactionState(tx),'pending');});
test('receipt progression does not signal completion before final results',()=>{const snapshots=[{status:'pending'},{status:'success',pendingResults:true},{status:'success',pendingResults:false}];assert.deepEqual(snapshots.map(transactionState),['pending','pending','confirmed']);});
