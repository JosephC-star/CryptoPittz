// Only export artwork resolved from the two official Pittz collections.
export async function handler(event) {
  const error = (statusCode) => ({ statusCode, body: 'Artwork unavailable.' });
  if (event.httpMethod !== 'GET') return error(405);
  const identifier = event.queryStringParameters?.identifier;
  if (!/^(PITTZ-1a4c2d|PITTZVICE-c3ec94)-[a-f0-9]{1,16}$/.test(identifier || '')) return error(400);
  try {
    const response = await fetch(`https://api.multiversx.com/nfts/${identifier}`, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return error(502);
    const nft = await response.json();
    if (nft.identifier !== identifier) return error(502);
    const media = nft.media?.[0];
    const url = new URL(media?.thumbnailUrl || media?.url || nft.url);
    if (url.protocol !== 'https:' || url.hostname !== 'media.multiversx.com' || url.port || url.username || url.password) return error(502);
    const artwork = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(10000) });
    const type = artwork.headers.get('content-type')?.split(';')[0];
    if (!artwork.ok || !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(type)) return error(502);
    const chunks = []; let size = 0;
    for await (const chunk of artwork.body) {
      size += chunk.length;
      if (size > 4 * 1024 * 1024) return error(502);
      chunks.push(chunk);
    }
    return { statusCode: 200, headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' }, body: Buffer.concat(chunks).toString('base64'), isBase64Encoded: true };
  } catch { return error(502); }
}
