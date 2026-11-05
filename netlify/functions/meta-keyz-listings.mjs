import { META_KEYZ_COLLECTION, validateListing } from '../../src/features/xoxno/validation.js';

const LIMIT = 100;
const keyTypes = new Set(['Hodler', 'Diamond']);

function keyAnimation(nft) {
  if (nft.media?.originalMedia?.contentType !== 'video/mp4' || typeof nft.url !== 'string') return null;
  const path = nft.url.match(/^https:\/\/media\.(?:elrond|multiversx)\.com(\/nfts\/asset\/[A-Za-z0-9]+\/[A-Za-z0-9_-]+\.mp4)$/i)?.[1];
  return path ? `https://media.multiversx.com${path}` : null;
}

function reply(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': statusCode === 200 ? 'public, max-age=20, s-maxage=40' : 'no-store',
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  if (event.httpMethod !== 'GET') return reply(405, { error: 'GET only.' });

  try {
    const filter = {
      top: LIMIT,
      filters: {
        collection: [META_KEYZ_COLLECTION],
        onSale: true,
        saleInfo: { marketplace: ['xoxno'] },
      },
    };
    const query = new URLSearchParams({ filter: JSON.stringify(filter) });
    const response = await fetch(`https://api.xoxno.com/nft/query?${query}`, {
      signal: AbortSignal.timeout(10000),
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw Error('Marketplace unavailable');
    const data = await response.json();
    if (!Array.isArray(data.resources) || data.resources.length > LIMIT) throw Error('Invalid listing feed');

    const listings = new Map();
    for (const nft of data.resources) {
      if (nft?.collection !== META_KEYZ_COLLECTION || nft.onSale !== true ||
          typeof nft.identifier !== 'string') continue;
      try {
        const listing = validateListing(nft, nft);
        const traits = nft.metadata?.attributes;
        const type = Array.isArray(traits)
          ? traits.find(trait => trait?.trait_type === 'Type')?.value : null;
        listings.set(nft.identifier, {
          identifier: nft.identifier,
          collection: META_KEYZ_COLLECTION,
          name: typeof nft.name === 'string' ? nft.name.slice(0, 100) : 'CryptoPittz Meta Key',
          price: listing.price,
          keyType: keyTypes.has(type) ? type : null,
          animationUrl: keyAnimation(nft),
        });
      } catch {
        // The in-site checkout accepts active fixed-price EGLD listings only.
      }
    }

    return reply(200, { listings: [...listings.values()], hasMore: data.hasMoreResults === true });
  } catch {
    return reply(502, { error: 'The Meta Keyz listing feed is temporarily unavailable.' });
  }
}
