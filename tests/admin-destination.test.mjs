import {test} from 'node:test';
import assert from 'node:assert/strict';
import {adminReturnPath,adminWalletCallbackPath} from '../src/features/merchant/adminDestination.mjs';
test('Back Booth admin sign-in returns only to the fixed booth page',()=>{
 assert.equal(adminReturnPath('?return=back-booths'),'/community-support/');
 for(const query of ['', '?return=https://example.com','?return=//example.com','?return=/merchant-access'])assert.equal(adminReturnPath(query),null);
});
test('wallet callback preserves booth intent only on admin login',()=>{
 assert.equal(adminWalletCallbackPath('/market-admin','?return=back-booths'),'/market-admin?return=back-booths');
 assert.equal(adminWalletCallbackPath('/market-admin/','?return=back-booths'),'/market-admin/?return=back-booths');
 assert.equal(adminWalletCallbackPath('/merchant-access','?return=back-booths'),'/merchant-access');
 assert.equal(adminWalletCallbackPath('/market-admin','?return=https://example.com'),'/market-admin');
});
