const expectedHost = 'xqdrecxqkldhznydglev.supabase.co';
const requiredTables = ['market_shops', 'market_products', 'market_inquiries', 'market_login_challenges', 'market_sessions', 'market_inquiry_rate'];
const requiredBuckets = ['market-product-images', 'market-inquiry-references'];

export async function handler(event) {
  const response = (statusCode, body) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    body: JSON.stringify(body)
  });
  if (event.httpMethod !== 'GET') return response(405, { ready: false, message: 'GET required.' });
  // No credentials or database records are included in diagnostic responses.
  const base = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!base || !secret) return response(503, { ready: false, stage: 'configuration', message: 'Backend environment settings are missing.' });
  let origin;
  try {
    const url = new URL(base);
    if (url.protocol !== 'https:' || url.hostname !== expectedHost || url.port || url.username || url.password || !['', '/'].includes(url.pathname) || url.search || url.hash) throw new Error();
    origin = url.origin;
  } catch {
    return response(503, { ready: false, stage: 'configuration', message: 'The Supabase project URL does not match this market.' });
  }
  const headers = { apikey: secret };
  // Legacy service-role keys also require Authorization; new secret keys are not JWTs.
  if (!secret.startsWith('sb_secret_')) headers.Authorization = 'Bearer ' + secret;
  try {
    const checks = await Promise.all(requiredTables.map(async table => {
      const result = await fetch(origin + '/rest/v1/' + table + '?select=*&limit=0', {
        headers, redirect: 'error', signal: AbortSignal.timeout(8000)
      });
      if (!result.ok) throw new Error('database');
    }));
    void checks;
    const result = await fetch(origin + '/storage/v1/bucket', {
      headers, redirect: 'error', signal: AbortSignal.timeout(8000)
    });
    if (!result.ok) throw new Error('storage');
    const buckets = await result.json();
    if (!Array.isArray(buckets) || !requiredBuckets.every(id => buckets.some(b => b.id === id && b.public === false))) throw new Error('storage');
    const shopResponse = await fetch(origin + '/rest/v1/market_shops?booth_number=eq.1&select=owner_wallet,access_status,rental_expires_at&limit=1', { headers, redirect:'error', signal:AbortSignal.timeout(8000) });
    if (!shopResponse.ok) throw new Error('assignment');
    const shop = (await shopResponse.json())?.[0];
    const assigned = shop?.owner_wallet === 'erd1uugf4thxgqv3m8jju2m9rc5vnx4yetk22ch8fddnzuddyv9fzgnscd3ynn'
      && (shop.access_status === 'test' || (shop.access_status === 'active' && Date.parse(shop.rental_expires_at) > Date.now()));
    return response(assigned ? 200 : 503, {
      ready: assigned,
      boothOne: assigned ? 'Gordon assigned with access' : 'assignment or access needs attention',
      inquiries: 'database setup ready',
      database: 'connected',
      photoStorage: 'private buckets ready',
      walletLogin: 'implemented; assigned-wallet test pending',
      message: assigned ? 'Backend and Booth 01 are ready for wallet and inquiry testing.' : 'Run the Gordon assignment setup before merchant testing.'
    });
  } catch {
    return response(503, { ready: false, stage: 'connection', message: 'Database or private storage verification failed. Check the inquiry SQL update and backend environment settings.' });
  }
}

