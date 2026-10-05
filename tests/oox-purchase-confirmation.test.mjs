import { test } from 'node:test';
import assert from 'node:assert/strict';
import { purchaseConfirmed } from '../src/features/oox/purchaseConfirmation.js';
const expected = { sender:'buyer', receiver:'contract', value:'100', data:'buy-data' };
const tx = { ...expected, status:'success' };
const identifier = 'PITTZ-1a4c2d-0284';
const owned = { identifier, collection:'PITTZ-1a4c2d', type:'NonFungibleESDT', balance:'1' };
test('celebrate only confirmed purchase and matching wallet NFT',()=>assert.equal(purchaseConfirmed(tx,owned,expected,identifier),true));
for(const [name,change] of Object.entries({pending:{status:'pending'},failure:{status:'fail'},sender:{sender:'other'},receiver:{receiver:'other'},price:{value:'200'},data:{data:'different'}})){
 test(`no celebration for ${name}`,()=>assert.equal(purchaseConfirmed({...tx,...change},owned,expected,identifier),false));
}
test('no celebration for a different NFT',()=>assert.equal(purchaseConfirmed(tx,{...owned,identifier:'PITTZ-1a4c2d-0285'},expected,identifier),false));
