import test from 'node:test';
import assert from 'node:assert/strict';
import { burnSpec, assertBurnSimulation, assertBurnReceipt } from '../src/features/bonez-burn/burnValidation.js';
const address = 'erd1' + 'a'.repeat(58);
test('burn is exact, self-addressed and restricted to BONEZ on mainnet', () => {
 const s = burnSpec(address, '1.234567');
 assert.equal(s.sender,address); assert.equal(s.receiver,address); assert.equal(s.chainID,'1'); assert.equal(s.value,'0');
 assert.equal(s.data,'ESDTLocalBurn@424f4e455a2d666639613733@12d687');
 assert.throws(() => burnSpec(address,'0')); assert.throws(() => burnSpec(address,'1.0000001')); assert.throws(() => burnSpec('bad','1'));
});
test('simulation must explicitly succeed with no signalError', () => {
 assertBurnSimulation({code:'successful',data:{result:{status:'success'}}});
 for (const data of [{}, {code:'successful',data:{result:{status:'fail'}}}, {code:'successful',data:{result:{status:'success',logs:{events:[{identifier:'signalError'}]}}}}, {code:'successful',data:{result:{receiverShard:{status:'success'},senderShard:{status:'fail'}}}}]) assert.throws(() => assertBurnSimulation(data));
});
test('receipt cannot celebrate another wallet, token, amount or failed transaction', () => {
 const review={address,amount:'1.234567'},s=burnSpec(address,review.amount);
 const receipt={sender:address,receiver:address,value:'0',data:btoa(s.data),status:'success'};
 assertBurnReceipt(receipt,review);
 for (const change of [{sender:'other'}, {receiver:'other'}, {data:btoa(burnSpec(address,'2').data)}, {value:'1'}, {status:'pending'}, {status:'fail'}]) assert.throws(() => assertBurnReceipt({...receipt,...change},review));
});
