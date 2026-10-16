import {Address} from '@multiversx/sdk-core';
import {KEY_COLLECTION,keyTypeFromChain,waived,priceFor} from './rental-policy.mjs';
async function read(url){const r=await fetch(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Key verification is temporarily unavailable. No rental payment is being requested.');return r.json();}
export async function verifyKeyBenefit(address){
  if(Address.newFromBech32(address).toBech32()!==address)throw Error('Invalid wallet.');
  let tier='standard',evidence=null,collection;
  for(let page=0;page<20;page++){
    const nfts=await read('https://api.multiversx.com/accounts/'+address+'/nfts?collections='+KEY_COLLECTION+'&from='+page*100+'&size=100');
    if(!Array.isArray(nfts)||nfts.length>100)throw Error('Key holdings could not be verified.');
    for(const nft of nfts){
      if(nft.collection!==KEY_COLLECTION||!/^CPMK-8d8a01-(?:[0-9a-f]{2})+$/.test(nft.identifier))throw Error('Unexpected key collection data.');
      const suffix=nft.identifier.slice(KEY_COLLECTION.length+1),nonce=Number.parseInt(suffix,16);
      if(!Number.isSafeInteger(nonce)||nonce<1||nft.nonce!==nonce)throw Error('Key nonce could not be verified.');
      const result=await read('https://gateway.multiversx.com/address/'+address+'/nft/'+KEY_COLLECTION+'/nonce/'+nonce);
      if(result.code!=='successful'||result.error)throw Error('On-chain key verification failed.');
      const token=result.data?.tokenData;
      if(token?.type==='' && collection===undefined){
        collection=await read('https://api.multiversx.com/collections/'+KEY_COLLECTION);
        if(collection?.collection!==KEY_COLLECTION||!['NonFungibleESDT','NonFungibleESDTv2'].includes(collection.type))throw Error('The key collection must be a verified NFT collection.');
      }
      const type=keyTypeFromChain(token,nft.identifier,collection);
      if(type==='diamond')return {tier:'diamond',keyIdentifier:nft.identifier,verifiedAt:new Date().toISOString(),source:'mainnet balance and attributes'};
      if(type==='meta'){tier='meta';evidence=nft.identifier;}
    }
    if(nfts.length<100)return {tier,keyIdentifier:evidence,verifiedAt:new Date().toISOString(),source:'mainnet balance and attributes'};
  }
  throw Error('Key verification exceeded its limit. No rental payment is being requested.');
}
export async function quoteRental(shop,months){
  const benefit=waived(shop)?{tier:'waived',verifiedAt:new Date().toISOString(),source:'assigned storefront access'}:await verifyKeyBenefit(shop.owner_wallet);
  return {...priceFor(months,benefit.tier),benefit:benefit.tier==='waived'?{verifiedAt:benefit.verifiedAt}:benefit,paymentsEnabled:false,message:'Price review only. Signing, payment collection and rental activation are not enabled yet.'};
}

