export const CONTRACT = 'erd1qqqqqqqqqqqqqpgqwp73w2a9eyzs64eltupuz3y3hv798vlv899qrjnflg';
const collections = new Set(['PITTZ-1a4c2d', 'PITTZVICE-c3ec94']);
export function validateListing(listing, nft, buyer) {
  if (!Number.isSafeInteger(listing.auctionId) || listing.auctionId <= 0 || !Number.isSafeInteger(listing.nonce) || listing.nonce <= 0) throw Error('Invalid listing identifiers.');
  // NFT nonce identifiers encode whole bytes, including a leading zero for odd hex lengths.
  const nonceHex = listing.nonce.toString(16);
  const encodedNonce = nonceHex.padStart(Math.ceil(nonceHex.length / 2) * 2, '0');
  if (!collections.has(nft.collection) || listing.collection !== nft.collection || listing.identifier !== nft.identifier || `${listing.collection}-${encodedNonce}` !== nft.identifier) throw Error('Listing does not match this Pitt.');
  if (!listing.isActive || listing.priceType !== 'fixed' || listing.saleType !== 'nft' || listing.quantity !== '1') throw Error('Only active, fixed-price single Pitt listings are supported in this preview.');
  if (listing.paymentToken !== 'EGLD' || listing.paymentTokenNonce !== 0 || listing.paymentTokenDecimals !== 18) throw Error('This preview supports EGLD purchases only.');
  if (!/^\d+$/.test(listing.price) || BigInt(listing.price) <= 0n) throw Error('Invalid price.');
  const now = Math.floor(Date.now() / 1000);
  if (listing.startTime > now || listing.deadline <= now) throw Error('Listing is not currently available.');
  if (buyer && buyer === listing.seller) throw Error('You cannot purchase your own listing.');
}
export function validateQuote(quote, listing, nft, buyer) {
  validateListing(quote.listing, nft, buyer);
  if (!quote.purchasable || quote.auctionId !== listing.auctionId || quote.listing.auctionId !== listing.auctionId || quote.quantity !== '1') throw Error('Purchase quote is unavailable or mismatched.');
  if (quote.totalPrice !== listing.price || quote.listing.price !== listing.price || quote.listing.seller !== listing.seller || quote.paymentToken !== 'EGLD' || quote.paymentTokenNonce !== 0 || quote.paymentTokenDecimals !== 18) throw Error('Listing changed. Reload it and review the new price.');
}
