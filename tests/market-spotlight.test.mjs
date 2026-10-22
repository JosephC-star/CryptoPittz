import test from 'node:test';
import assert from 'node:assert/strict';
import {featuredShop} from '../shared/featured-shop.mjs';
import {inlineCopy,plainCopy} from '../public/flea-market/merchant-copy.mjs';
import {active} from '../netlify/functions/market-api.mjs';
test('spotlight gives every named active merchant a full Central calendar day',()=>{
 const shops=[{booth_number:3,name:'Third'},{booth_number:1,name:'First'},{booth_number:2,name:'Second'}];
 assert.deepEqual([22,23,24,25].map(day=>featuredShop(shops,new Date(`2026-10-${day}T12:00:00Z`)).booth_number),[1,2,3,1]);
 assert.equal(featuredShop(shops,new Date('2026-10-23T04:59:59Z')).booth_number,1);
 assert.equal(featuredShop(shops,new Date('2026-10-23T05:00:00Z')).booth_number,2);
 assert.equal(featuredShop([]),null);
 assert.equal(featuredShop([{name:'  ',booth_number:9}]),null);
});
test('eligibility excludes suspended and expired stores',()=>{
 const shops=[{name:'A',booth_number:1,access_status:'test'},{name:'B',booth_number:2,access_status:'test',moderation_suspended:true},{name:'C',booth_number:3,access_status:'active',rental_expires_at:'2020-01-01'}];
 assert.equal(featuredShop(shops.filter(active)).name,'A');
});
test('merchant emphasis retains words and treats HTML as ordinary text',()=>{
 assert.deepEqual(inlineCopy('**Made by hand** and *one of one*'),[{kind:'strong',text:'Made by hand'},{kind:'text',text:' and '},{kind:'em',text:'one of one'}]);
 assert.equal(plainCopy('**Hello**\n\n*World*'),'Hello World');
 assert.deepEqual(inlineCopy('<img src=x onerror=alert(1)>'),[{kind:'text',text:'<img src=x onerror=alert(1)>'}]);
});
