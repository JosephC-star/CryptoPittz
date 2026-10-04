import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkTransaction } from '../src/features/oox/transactionValidation.js';
const payload={sender:'buyer',receiver:'contract',value:'100',data:'encoded',gasLimit:16000000,chainID:'1',gasPrice:1000000000,version:2};
const expected={sender:'buyer',receiver:'contract',value:'100',data:'encoded',gasLimit:16000000};
test('accept reviewed payload',()=>assert.doesNotThrow(()=>checkTransaction({toSendable:()=>payload},expected)));
for(const [key,value] of Object.entries({sender:'other',receiver:'other',value:'200',data:'changed',gasLimit:99999999,chainID:'D',gasPrice:2000000000,version:1,relayer:'other',guardian:'other'}))test(`reject altered ${key}`,()=>assert.throws(()=>checkTransaction({toSendable:()=>({...payload,[key]:value})},expected)));
