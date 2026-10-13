import test from 'node:test';
import assert from 'node:assert/strict';
import {contributionSpec, assertContributionSimulation, assertContributionReceipt, BURN_PILE_ADDRESS, BURN_PILE_TOPIC} from '../src/features/bonez-burn/contributionValidation.js';
const address='erd1sgwctnfw0yv4uhet5pveevhejyaqkf9xz8m0mavj32uxec3qal0s6yurrw';
const spec=contributionSpec(address,'1000');
const event={identifier:'ESDTTransfer',address,topics:[btoa('BONEZ-ff9a73'),'','O5rKAA==',BURN_PILE_TOPIC]};
const simulation=(events=[event])=>({code:'successful',data:{result:{senderShard:{status:'success',logs:{events}},receiverShard:{status:'success',logs:{events}}}}});
const pending={kind:'contribution',recipient:BURN_PILE_ADDRESS,address,amount:'1000'};
const receipt={status:'success',sender:address,receiver:BURN_PILE_ADDRESS,value:'0',data:btoa(spec.data),logs:{events:[event]}};
test('contributions are exact six-decimal transfers to the fixed team wallet, never local burns',()=>{
 assert.equal(spec.receiver,BURN_PILE_ADDRESS);assert.equal(spec.value,'0');assert.equal(spec.chainID,'1');assert.equal(spec.data,'ESDTTransfer@424f4e455a2d666639613733@3b9aca00');assert.deepEqual(contributionSpec(address,'1000.000000'),spec);assert.equal(spec.gasLimit,500000);assert.throws(()=>contributionSpec(BURN_PILE_ADDRESS,'1'));for(const amount of ['0','-1','1e9','0.0000001'])assert.throws(()=>contributionSpec(address,amount));
});
test('verification requires both shards to succeed and the exact recipient/token/amount transfer event',()=>{
 assertContributionSimulation(simulation(),spec);
 const failed=simulation();failed.data.result.senderShard.status='fail';assert.throws(()=>assertContributionSimulation(failed,spec));
 for(const bad of [{...event,identifier:'ESDTLocalBurn'},{...event,address:BURN_PILE_ADDRESS},...event.topics.map((_,i)=>({...event,topics:event.topics.map((v,j)=>j===i?'wrong':v)}))])assert.throws(()=>assertContributionSimulation(simulation([bad]),spec));
 assert.throws(()=>assertContributionSimulation(simulation([]),spec));assert.throws(()=>assertContributionSimulation(simulation([event,{identifier:'signalError'}]),spec));assert.throws(()=>assertContributionSimulation(simulation(),{...spec,receiver:address}));assert.throws(()=>assertContributionSimulation(simulation(),{...spec,data:spec.data+'@extra'}));
});
test('a successful receipt must prove the contribution, not a pending, failed or unrelated burn',()=>{
 assert.equal(assertContributionReceipt(receipt,pending),receipt);
 for(const changes of [{status:'pending'},{status:'fail'},{sender:BURN_PILE_ADDRESS},{receiver:address},{value:'1'},{data:btoa(spec.data+'@extra')},{logs:{events:[]}}])assert.throws(()=>assertContributionReceipt({...receipt,...changes},pending));
 assert.throws(()=>assertContributionReceipt(receipt,{...pending,amount:'1001'}));assert.throws(()=>assertContributionReceipt(receipt,{...pending,recipient:address}));assert.throws(()=>assertContributionReceipt(receipt,{...pending,kind:'burn'}));
});
