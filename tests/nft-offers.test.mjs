import test from 'node:test';
import assert from 'node:assert/strict';
import {nftOfferUrl,canOffer} from '../src/utils/nftOffers.mjs';
const nft={collection:'PITTZ-1a4c2d',identifier:'PITTZ-1a4c2d-01'};
test('unlisted Pittz offers open the exact OOX NFT page, including Vice',()=>{
 assert.equal(nftOfferUrl(nft),'https://www.oox.art/marketplace/nfts/PITTZ-1a4c2d-01');assert.equal(canOffer({nft,isOwned:false}),true);
 assert.equal(nftOfferUrl({collection:'PITTZVICE-c3ec94',identifier:'PITTZVICE-c3ec94-ff'}),'https://www.oox.art/marketplace/nfts/PITTZVICE-c3ec94-ff');
});
test('owners, known listings and supported purchases suppress the offer prompt',()=>{
 for(const flags of [{isOwned:true},{listed:true},{purchaseAvailable:true}])assert.equal(canOffer({nft,...flags}),false);
});
test('unsupported and malformed identifiers cannot form marketplace offer URLs',()=>{
 for(const bad of [null,{}, {...nft,identifier:nft.identifier+'?redirect=evil'}, {...nft,collection:'OTHER-abcdef'},{...nft,identifier:'PITTZVICE-c3ec94-01'}]){assert.equal(nftOfferUrl(bad),null);assert.equal(canOffer({nft:bad}),false);}
});
