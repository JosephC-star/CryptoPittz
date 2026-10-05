import {test} from 'node:test';
import assert from 'node:assert/strict';
import {identifyListingMarkets} from '../src/utils/listingMarketplace.js';
const rows=[{identifier:'PITTZ-1a4c2d-3c',price:'57'},{identifier:'PITTZ-1a4c2d-01',price:'2'},{identifier:'PITTZ-1a4c2d-02',price:'3'}];
test('identifies actual escrow marketplace without defaulting unknown listings to OOX',async()=>{
 const result=await identifyListingMarkets(rows,undefined,async()=>({ok:true,json:async()=>[
  {identifier:rows[0].identifier,owner:'erd1qqqqqqqqqqqqqpgqwp73w2a9eyzs64eltupuz3y3hv798vlv899qrjnflg'},
  {identifier:rows[1].identifier,owner:'erd1qqqqqqqqqqqqqpgq6wegs2xkypfpync8mn2sa5cmpqjlvrhwz5nqgepyg8'},
  {identifier:rows[2].identifier,owner:'unknown-contract'}
 ]}));
 assert.deepEqual(result.map(x=>x.marketplace),['OOX','XOXNO',null]);
 assert.equal(result[0].price,'57');
});
test('failed source lookup keeps sale listings and leaves marketplace unverified',async()=>{
 const result=await identifyListingMarkets(rows,undefined,async()=>{throw Error('offline')});
 assert.equal(result.length,rows.length);assert.ok(result.every(x=>x.marketplace===null));
});
test('ignores unrelated NFT identifiers returned by the lookup',async()=>{
 const result=await identifyListingMarkets([rows[0]],undefined,async()=>({ok:true,json:async()=>[{identifier:rows[1].identifier,owner:'erd1qqqqqqqqqqqqqpgqwp73w2a9eyzs64eltupuz3y3hv798vlv899qrjnflg'}]}));
 assert.equal(result[0].marketplace,null);
});
