const COLLECTIONS=new Set(['PITTZ-1a4c2d','PITTZVICE-c3ec94']);
export function nftOfferUrl(nft){
 if(!COLLECTIONS.has(nft?.collection)||typeof nft?.identifier!=='string'||!new RegExp('^'+nft.collection+'-[0-9a-f]+$','i').test(nft.identifier))return null;
 return 'https://www.oox.art/marketplace/nfts/'+encodeURIComponent(nft.identifier);
}
export function canOffer({nft,isOwned,listed=false,purchaseAvailable=false}){
 return !isOwned&&!listed&&!purchaseAvailable&&!!nftOfferUrl(nft);
}
