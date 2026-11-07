import test from 'node:test';
import assert from 'node:assert/strict';
import {saveSupportReceipt} from '../src/features/community-support/receipt-flow.mjs';
const receipt={hash:'a'.repeat(64),address:'erd1purchaser',booth:2,usd:10,pricingToken:'signed-price',visible:true};
const origin='https://thepittzstop.com';
test('confirmed receipt preserves booth, purchaser, price and public choice in wallet approval and save',async()=>{
 let saved,approved;
 const result=await saveSupportReceipt({receipt,origin,visible:false,sign:async(address,message)=>{assert.equal(address,receipt.address);approved=message;return 'wallet-signature';},save:async body=>{saved=body;return {recorded:true};}});
 assert.match(approved,/Booth: 2/);assert.match(approved,/Public supporter name and USD and BONEZ totals: yes/);assert.equal(saved.signature,'wallet-signature');assert.equal(saved.pricingToken,receipt.pricingToken);assert.equal(saved.hash,receipt.hash);assert.equal(result.visible,true);
});
test('temporary transfer indexing retries reuse one free signature',async()=>{
 let signs=0,saves=0,waits=0;
 await saveSupportReceipt({receipt,origin,sign:async()=>{signs++;return 'signature';},save:async()=>{saves++;if(saves<3)throw Object.assign(Error('Purchase transfer details are not indexed yet.'),{status:422});return {recorded:true};},wait:async()=>{waits++;}});
 assert.equal(signs,1);assert.equal(saves,3);assert.equal(waits,2);
});
test('cancelled approval never saves a receipt and unconfirmed saves never report success',async()=>{
 let saves=0;
 await assert.rejects(saveSupportReceipt({receipt,origin,sign:async()=>{throw Error('Approval cancelled');},save:async()=>{saves++;}}),/cancelled/);assert.equal(saves,0);
 await assert.rejects(saveSupportReceipt({receipt,origin,sign:async()=> 'signature',save:async()=>({})}),/could not be confirmed/);
});
test('private choice remains private and invalid purchase failures do not retry',async()=>{
 let saves=0;
 const privateReceipt={...receipt,visible:false};
 const result=await saveSupportReceipt({receipt:privateReceipt,origin,visible:true,sign:async(_,message)=>{assert.match(message,/totals: no/);return 'signature';},save:async body=>{assert.equal(body.visible,false);return {recorded:true};}});assert.equal(result.visible,false);
 await assert.rejects(saveSupportReceipt({receipt,origin,sign:async()=> 'signature',save:async()=>{saves++;throw Object.assign(Error('Wrong purchase amount'),{status:422});},wait:async()=>{throw Error('must not retry');}}),/Wrong purchase amount/);assert.equal(saves,1);
});
test('automatic receipts post publicly without a second wallet prompt',async()=>{
 const result=await saveSupportReceipt({receipt:{...receipt,automatic:true},origin,visible:false,
  sign:async()=>assert.fail('Automatic purchases do not request a receipt signature'),
  save:async body=>{assert.equal(body.visible,true);assert.equal(body.signature,undefined);return {recorded:true};}});
 assert.equal(result.visible,true);
});
