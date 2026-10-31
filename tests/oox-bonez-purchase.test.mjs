import test from 'node:test';
import assert from 'node:assert/strict';
import {OOXClient} from '@oox-marketplace/sdk-core';
import {validateListing,validateQuote,CONTRACT,BONEZ} from '../src/features/oox/validation.js';
import {buyExpected,assertPurchaseFunds} from '../src/features/oox/purchasePayment.mjs';
import {checkTransaction} from '../src/features/oox/transactionValidation.js';
import {purchaseConfirmed} from '../src/features/oox/purchaseConfirmation.js';
const nft={collection:'PITTZ-1a4c2d',identifier:'PITTZ-1a4c2d-1a13'};
const listing={...nft,auctionId:11235,nonce:6675,quantity:'1',saleType:'nft',priceType:'fixed',paymentToken:BONEZ,paymentTokenNonce:0,paymentTokenDecimals:6,price:'480000000000',seller:'seller',isActive:true,startTime:1785941046,deadline:1817476984};
const quote={listing,auctionId:11235,quantity:'1',purchasable:true,paymentToken:BONEZ,paymentTokenNonce:0,paymentTokenDecimals:6,totalPrice:listing.price};
test('accept six-decimal BONEZ listing and quote; reject token/decimal/amount changes',()=>{
 assert.doesNotThrow(()=>validateQuote(quote,listing,nft,CONTRACT));
 for(const changes of [{paymentToken:'FAKE-ffffff'},{paymentTokenDecimals:18},{paymentTokenNonce:1}])assert.throws(()=>validateListing({...listing,...changes},nft));
 for(const changes of [{paymentToken:'EGLD'},{paymentTokenDecimals:18},{totalPrice:'480000000001'},{listing:{...listing,paymentToken:'EGLD',paymentTokenDecimals:18}}])assert.throws(()=>validateQuote({...quote,...changes},listing,nft,CONTRACT));
});
test('SDK BONEZ transfer matches exact token, amount, endpoint and NFT; EGLD stays native',async()=>{
 const client=new OOXClient({network:'mainnet'});
 for(const token of [BONEZ,'EGLD']){
 const l={...listing,paymentToken:token};
 const tx=await client.tx.buy({sender:CONTRACT,nonce:1n,auctionId:l.auctionId,collection:l.collection,nftNonce:l.nonce,paymentToken:token,paymentTokenNonce:0,amount:BigInt(l.price)});
 const expected=buyExpected(CONTRACT,nft,l,l.price,CONTRACT);
 const payload=checkTransaction(tx,expected);
 assert.equal(payload.value,token===BONEZ?'0':l.price);
 if(token===BONEZ)assert.equal(atob(payload.data),'ESDTTransfer@424f4e455a2d666639613733@6fc23ac000@627579@2be3@504954545a2d316134633264@1a13');
 const changed={...payload,data:btoa(atob(payload.data).replace('1a13','1a14'))};
 assert.throws(()=>checkTransaction({toSendable:()=>changed},expected));
 assert(purchaseConfirmed({...payload,status:'success'},{...nft,type:'NonFungibleESDT',balance:'1'},expected,nft.identifier));
 }
});
test('BONEZ purchase separately requires exact token funds and EGLD fee funds',()=>{
 assert.doesNotThrow(()=>assertPurchaseFunds('16000000000000000',listing.price,listing.price,'16000000000000000'));
 assert.throws(()=>assertPurchaseFunds('16000000000000000','479999999999',listing.price,'16000000000000000'),/Insufficient BONEZ/);
 assert.throws(()=>assertPurchaseFunds('15999999999999999',listing.price,listing.price,'16000000000000000'),/EGLD/);
 assert.throws(()=>assertPurchaseFunds('99999999999999999',null,listing.price,1),/BONEZ/);
});
