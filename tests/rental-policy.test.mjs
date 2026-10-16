import test from 'node:test';import assert from 'node:assert/strict';
import {priceFor,waived,keyTypeFromChain,rentalSpec,verifyRentalReceipt,RENTAL_RECIPIENT,RENTAL_TOKEN} from '../server/rental-policy.mjs';
import {verifyKeyBenefit,quoteRental} from '../server/rental-keys.mjs';
const address='erd1xnw82n5cdpzt3lu9yvu9urhvwfrhkcna9hhl5fc4pap4elc5hkcs85uavh';
const attrs=type=>Buffer.from('Series:V1 Limited Edition;Type:'+type+';tags:CryptoPittz').toString('base64');
test('confirmed prepaid rates and non-stacking discounts use six-decimal integer arithmetic',()=>{for(const [months,base,meta]of [[1,'60000','30000'],[6,'330000','165000'],[12,'600000','300000']]){assert.equal(priceFor(months,'standard').amountBonez,base);assert.equal(priceFor(months,'meta').amountBonez,meta);assert.equal(priceFor(months,'meta').amountAtomic,(BigInt(meta)*1000000n).toString());assert.equal(priceFor(months,'diamond').amountAtomic,'0');assert.equal(priceFor(months,'waived').amountAtomic,'0');}for(const months of [0,2,6.5,'6'])assert.throws(()=>priceFor(months,'standard'));});
test('private backend access flags control existing no-charge access',()=>{assert(waived({access_status:'test'}));assert(waived({rental_fee_waived:true,access_status:'active'}));assert(!waived({access_status:'active'}));assert(!waived({access_status:'pending'}));assert(!waived(null));});
test('key tiers come from on-chain attributes and balance, not names or thumbnails',()=>{const token={tokenIdentifier:'CPMK-8d8a01',type:'NonFungibleESDTv2',balance:'1',attributes:attrs('Diamond')};assert.equal(keyTypeFromChain(token,'CPMK-8d8a01-016e'),'diamond');assert.equal(keyTypeFromChain({...token,attributes:attrs('Hodler')},'CPMK-8d8a01-016e'),'meta');assert.equal(keyTypeFromChain({...token,balance:'0'},'CPMK-8d8a01-016e'),null);assert.equal(keyTypeFromChain(token,'FAKE-123456-01'),null);assert.throws(()=>keyTypeFromChain({...token,attributes:Buffer.from('Type:Diamond;Type:Hodler').toString('base64')},'CPMK-8d8a01-016e'));});
test('paid spec pins exact amount, token and existing Pittensor recipient',()=>{const q=priceFor(6,'meta'),spec=rentalSpec(address,q);assert.equal(spec.receiver,RENTAL_RECIPIENT);assert.equal(spec.data,'ESDTTransfer@424f4e455a2d666639613733@'+BigInt('165000000000').toString(16).padStart(10,'0'));assert.throws(()=>rentalSpec(address,{...q,recipient:address}));assert.throws(()=>rentalSpec(address,{...q,amountAtomic:'1'}));assert.throws(()=>rentalSpec(address,priceFor(1,'diamond')));});
test('receipt requires exact transfer, nonce, hash and review timing',()=>{const q={...priceFor(1,'standard'),address,expectedNonce:3,createdAt:100000,expiresAt:400000};const spec=rentalSpec(address,q),hash='ab'.repeat(32);let hex=BigInt(q.amountAtomic).toString(16);if(hex.length%2)hex='0'+hex;const tx={txHash:hash,sender:address,receiver:RENTAL_RECIPIENT,status:'success',value:'0',data:Buffer.from(spec.data).toString('base64'),nonce:3,timestamp:200,logs:{events:[{identifier:'ESDTTransfer',address,topics:[Buffer.from(RENTAL_TOKEN).toString('base64'),'',Buffer.from(hex,'hex').toString('base64'),'fpGH2htfx9GEA2SuQbFDWV3XMryOBGq7xuSq+FIGCaQ=']}]}};assert.equal(verifyRentalReceipt(tx,q,hash).amountAtomic,'60000000000');for(const patch of [{sender:RENTAL_RECIPIENT},{receiver:address},{status:'pending'},{nonce:4},{timestamp:50},{timestamp:500},{pendingResults:true},{data:''},{logs:{events:[]}}])assert.throws(()=>verifyRentalReceipt({...tx,...patch},q,hash));});
const originalFetch=globalThis.fetch;test.after(()=>{globalThis.fetch=originalFetch});
test('benefit verification checks actual ownership and prioritizes Diamond',async()=>{let calls=0;globalThis.fetch=async url=>{calls++;return String(url).includes('/accounts/')?Response.json([{identifier:'CPMK-8d8a01-016e',collection:'CPMK-8d8a01',nonce:366,name:'Misleading text does not matter'}]):Response.json({code:'successful',error:'',data:{tokenData:{balance:'1',type:'NonFungibleESDTv2',tokenIdentifier:'CPMK-8d8a01',attributes:attrs('Diamond')}}})};assert.equal((await verifyKeyBenefit(address)).tier,'diamond');assert.equal(calls,2)});
test('stale indexed ownership never produces an unowned key discount',async()=>{globalThis.fetch=async url=>String(url).includes('/accounts/')?Response.json([{identifier:'CPMK-8d8a01-016e',collection:'CPMK-8d8a01',nonce:366}]):Response.json({code:'successful',error:'',data:{tokenData:{balance:'0',tokenIdentifier:'CPMK-8d8a01'}}});assert.equal((await verifyKeyBenefit(address)).tier,'standard')});
test('verification outages fail closed rather than assuming a price',async()=>{globalThis.fetch=async()=>new Response('unavailable',{status:503});await assert.rejects(verifyKeyBenefit(address),/unavailable/)});
test('private booth access never discloses its personal reason or enables payment',async()=>{globalThis.fetch=()=>{throw Error('No chain call needed for existing private access')};const quote=await quoteRental({access_status:'test',owner_wallet:address},12);assert.equal(quote.amountAtomic,'0');assert.equal(quote.paymentsEnabled,false);assert(!JSON.stringify(quote).includes('Gordon'));assert(!JSON.stringify(quote).includes('OG'));});


test('legacy blank gateway type requires exact NFT collection corroboration',async()=>{
  const token={balance:'1',type:'',nonce:8,tokenIdentifier:'CPMK-8d8a01',attributes:attrs('Diamond')};
  const collection={collection:'CPMK-8d8a01',type:'NonFungibleESDT'};
  assert.throws(()=>keyTypeFromChain(token,'CPMK-8d8a01-08'));
  assert.equal(keyTypeFromChain(token,'CPMK-8d8a01-08',collection),'diamond');
  for(const bad of [{...collection,collection:'FAKE-123456'},{...collection,type:'SemiFungibleESDT'}])assert.throws(()=>keyTypeFromChain(token,'CPMK-8d8a01-08',bad));
  assert.throws(()=>keyTypeFromChain({...token,type:'SemiFungibleESDT'},'CPMK-8d8a01-08',collection));
  assert.equal(keyTypeFromChain({...token,balance:'0'},'CPMK-8d8a01-08',collection),null);
  let calls=0;
  globalThis.fetch=async url=>{calls++;return Response.json(String(url).includes('/accounts/')?[{identifier:'CPMK-8d8a01-08',collection:'CPMK-8d8a01',nonce:8}]:String(url).includes('/collections/')?collection:{code:'successful',error:'',data:{tokenData:token}})};
  assert.equal((await verifyKeyBenefit(address)).tier,'diamond');assert.equal(calls,3);
  globalThis.fetch=async url=>Response.json(String(url).includes('/accounts/')?[{identifier:'CPMK-8d8a01-08',collection:'CPMK-8d8a01',nonce:8}]:String(url).includes('/collections/')?{...collection,type:'SemiFungibleESDT'}:{code:'successful',error:'',data:{tokenData:token}});
  await assert.rejects(verifyKeyBenefit(address),/verified NFT collection/);
});

test('one-BONEZ test policy pins wallet, preview, term and receipt amount',async()=>{
 const {reviewPrice}=await import('../server/rental-policy.mjs');
 const {RENTAL_TEST_POLICY,RENTAL_TEST_WALLET,RENTAL_TEST_ORIGIN}=await import('../shared/market-rental-test.mjs');
 const q={...reviewPrice(1,'standard',RENTAL_TEST_POLICY,RENTAL_TEST_WALLET,RENTAL_TEST_ORIGIN),address:RENTAL_TEST_WALLET,origin:RENTAL_TEST_ORIGIN,expectedNonce:3,createdAt:100000,expiresAt:400000};
 assert.equal(q.amountAtomic,'1000000');
 for(const args of [[1,'standard',RENTAL_TEST_POLICY,address,RENTAL_TEST_ORIGIN],[1,'standard',RENTAL_TEST_POLICY,RENTAL_TEST_WALLET,'https://thepittzstop.com'],[6,'standard',RENTAL_TEST_POLICY,RENTAL_TEST_WALLET,RENTAL_TEST_ORIGIN],[1,'diamond',RENTAL_TEST_POLICY,RENTAL_TEST_WALLET,RENTAL_TEST_ORIGIN]])assert.throws(()=>reviewPrice(...args));
 const spec=rentalSpec(q.address,q),txHash='cd'.repeat(32);
 const tx={txHash,sender:q.address,receiver:RENTAL_RECIPIENT,status:'success',value:'0',nonce:3,timestamp:200,data:Buffer.from(spec.data).toString('base64'),logs:{events:[{identifier:'ESDTTransfer',address:q.address,topics:[Buffer.from(RENTAL_TOKEN).toString('base64'),'',Buffer.from('0f4240','hex').toString('base64'),'fpGH2htfx9GEA2SuQbFDWV3XMryOBGq7xuSq+FIGCaQ=']}]}};
 assert.equal(verifyRentalReceipt(tx,q,txHash).amountAtomic,'1000000');
 assert.throws(()=>verifyRentalReceipt({...tx,data:Buffer.from('ESDTTransfer@424f4e455a2d666639613733@01').toString('base64')},q,txHash));
 assert.throws(()=>rentalSpec(q.address,{...q,amountAtomic:'1'}));
});
