const expectedHost = 'xqdrecxqkldhznydglev.supabase.co';
const requiredTables = ['market_shops', 'market_products', 'market_inquiries', 'market_login_challenges', 'market_sessions'];
const requiredBuckets = ['market-product-images', 'market-inquiry-references'];

export async function handler(event) {
  const response = (statusCode, body) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    body: JSON.stringify(body)
  });
  if (event.httpMethod !== 'GET') return response(405, { ready: false, message: 'GET required.' });
  // This diagnostic is intentionally available only in the merchant deploy preview.
  if (process.env.CONTEXT !== 'deploy-preview' || process.env.HEAD !== 'preview/merchant-dashboard') {
    return response(404, { ready: false });
  }
  const base = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!base || !secret) return response(503, { ready: false, stage: 'configuration', message: 'Backend environment settings are missing.' });
  let origin;
  try {
    const url = new URL(base);
    if (url.protocol !== 'https:' || url.hostname !== expectedHost || url.port || url.username || url.password || !['', '/'].includes(url.pathname) || url.search || url.hash) throw new Error();
    origin = url.origin;
  } catch {
    return response(503, { ready: false, stage: 'configuration', message: 'The Supabase project URL does not match this preview.' });
  }
  const headers = { apikey: secret };
  // Legacy service-role keys also require Authorization; new secret keys are not JWTs.
  if (!secret.startsWith('sb_secret_')) headers.Authorization = 'Bearer ' + secret;
  try {
    const checks = await Promise.all(requiredTables.map(async table => {
      const result = await fetch(origin + '/rest/v1/' + table + '?select=id&limit=0', {
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
    return response(200, {
      ready: true,
      database: 'connected',
      photoStorage: 'private buckets ready',
      walletLogin: 'not connected yet',
      message: 'Backend connection verified. Merchant access remains disabled.'
    });
  } catch {
    return response(503, { ready: false, stage: 'connection', message: 'Database or private storage verification failed. Check the SQL setup and backend key.' });
  }
}
