const collections = ['PITTZ-1a4c2d', 'PITTZVICE-c3ec94'];
export async function handler(event) {
  const reply = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
  if (event.httpMethod !== 'GET') return reply(405, { error: 'GET only.' });
  const seller = event.queryStringParameters?.seller;
  const page = Number(event.queryStringParameters?.page || 0);
  if (!/^erd1[a-z0-9]{58}$/.test(seller || '') || !Number.isInteger(page) || page < 0 || page > 1000) return reply(400, { error: 'Invalid wallet or page.' });
  const filter = { top: 12, skip: page * 12, includeCount: true, filters: { collection: collections, onSale: true, saleInfo: { seller: [seller], marketplace: ['xoxno'] } } };
  try {
    const response = await fetch(`https://api.xoxno.com/nft/query?filter=${encodeURIComponent(JSON.stringify(filter))}`, { signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json' } });
    if (!response.ok) throw Error('Unavailable');
    const data = await response.json();
    if (!Array.isArray(data.resources) || data.resources.length > 12) throw Error('Invalid response');
    if (data.resources.some(nft => nft.saleInfo?.seller !== seller || nft.saleInfo?.marketplace !== 'xoxno' || !collections.includes(nft.collection) || !nft.identifier?.startsWith(`${nft.collection}-`) || !nft.onSale)) throw Error('Listing mismatch');
    return reply(200, { resources: data.resources, hasMoreResults: data.hasMoreResults === true });
  } catch {
    return reply(502, { error: 'XOXNO listings are temporarily unavailable. Please refresh to try again.' });
  }
}
