import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesListingCurrency} from '../src/features/dawg-pound/listingCurrency.mjs';
const rows=[{id:'egld',paymentToken:'EGLD'},{id:'bonez',paymentToken:'BONEZ-ff9a73'},{id:'other',paymentToken:'OTHER-123456'},{id:'unknown'}];
test('mixed view retains all listings; currency views match exact payment token',()=>{
 assert.deepEqual(rows.filter(row=>matchesListingCurrency(row,'all')),rows);
 assert.deepEqual(rows.filter(row=>matchesListingCurrency(row,'EGLD')).map(row=>row.id),['egld']);
 assert.deepEqual(rows.filter(row=>matchesListingCurrency(row,'BONEZ')).map(row=>row.id),['bonez']);
 assert.equal(matchesListingCurrency({paymentToken:'BONEZ-fake00'},'BONEZ'),false);
 assert.equal(matchesListingCurrency(null,'all'),false);
});
test('currency filtering happens before paging, including matches on later mixed pages',()=>{
 const listings=Array.from({length:120},(_,i)=>({id:i,paymentToken:i%2?'EGLD':'BONEZ-ff9a73'}));
 const filtered=listings.filter(row=>matchesListingCurrency(row,'BONEZ'));
 assert.equal(filtered.length,60);
 assert.equal(Math.ceil(filtered.length/40),2);
 assert.deepEqual(filtered.slice(40,80).map(row=>row.id),Array.from({length:20},(_,i)=>80+i*2));
});
