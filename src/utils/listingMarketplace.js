// Identified mainnet NFT escrow contracts. Source: MultiversX account registry.
const MARKETPLACES = new Map([
  ['erd1qqqqqqqqqqqqqpgqwp73w2a9eyzs64eltupuz3y3hv798vlv899qrjnflg', 'OOX'],
  ['erd1qqqqqqqqqqqqqpgq6wegs2xkypfpync8mn2sa5cmpqjlvrhwz5nqgepyg8', 'XOXNO'],
]);
export function listingMarketplace(owner) {
  return MARKETPLACES.get(owner) || null;
}
export async function identifyListingMarkets(listings, signal, fetchImpl = fetch) {
  const identifiers = [...new Set(listings.map(x => x.identifier).filter(id => /^PITTZ(?:VICE)?-[a-f0-9]{6}-[a-f0-9]+$/.test(id)))];
  const markets = new Map();
  // Bound parallel lookups, and never infer XOXNO merely from absence on OOX.
  for (let offset = 0; offset < identifiers.length; offset += 100) {
    const batches = [];
    for (let start = offset; start < Math.min(offset + 100, identifiers.length); start += 25) {
      batches.push(identifiers.slice(start, Math.min(start + 25, offset + 100)));
    }
    await Promise.all(batches.map(async ids => {
      try {
        const params = new URLSearchParams({identifiers: ids.join(','), withOwner: 'true', size: String(ids.length)});
        const response = await fetchImpl(`https://api.multiversx.com/nfts?${params}`, {signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000)});
        if (!response.ok) return;
        const nfts = await response.json();
        if (!Array.isArray(nfts)) return;
        for (const nft of nfts) if (ids.includes(nft.identifier)) markets.set(nft.identifier, listingMarketplace(nft.owner));
      } catch (error) {
        if (signal?.aborted) throw error;
        // Leave the source unverified when ownership lookup is unavailable.
      }
    }));
  }
  return listings.map(listing => ({...listing, marketplace: markets.get(listing.identifier) || null}));
}
