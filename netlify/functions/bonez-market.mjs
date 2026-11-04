import {BONEZ_PAIR_ADDRESS, BONEZ_TOKEN_ID} from '../../src/config/collections.js';

export function marketPair(data) {
  if (data?.address !== BONEZ_PAIR_ADDRESS || data?.id !== 'BONEZWEGLD-c5db6b' || data?.baseId !== BONEZ_TOKEN_ID || data?.quoteId !== 'WEGLD-bd4d79' || data?.exchange !== 'xexchange' || data?.state !== 'active') throw Error('Unexpected market pair.');
  const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
  if (!positive(data.basePrice) || !positive(data.quotePrice)) throw Error('Market prices are unavailable.');
  const pair = {
    pairAddress: data.address,
    priceUsd: data.basePrice,
    priceNative: data.basePrice / data.quotePrice,
    source: 'MultiversX API · xExchange',
    url: 'https://xexchange.com/liquidity/BONEZWEGLD-c5db6b/create-position/pool',
  };
  if (typeof data.volume24h === 'number' && Number.isFinite(data.volume24h) && data.volume24h >= 0) pair.volume = {h24: data.volume24h};
  if (typeof data.totalValue === 'number' && Number.isFinite(data.totalValue) && data.totalValue >= 0) pair.liquidity = {usd: data.totalValue};
  if (positive(data.basePrevious24hPrice)) pair.priceChange = {h24: (data.basePrice / data.basePrevious24hPrice - 1) * 100};
  // This source does not split trades into buys/sells or report token market cap.
  // Leave these absent so the UI shows unavailable, rather than invented zeros.
  return pair;
}

export async function handler(event) {
  const reply = (statusCode, body) => ({statusCode, headers: {'Content-Type': 'application/json', 'Cache-Control': statusCode === 200 ? 'public, max-age=30, s-maxage=60' : 'no-store', 'X-Content-Type-Options': 'nosniff'}, body: JSON.stringify(body)});
  if (event.httpMethod !== 'GET') return reply(405, {error: 'GET required.'});
  try {
    const response = await fetch('https://api.multiversx.com/mex/pairs/BONEZ-ff9a73/WEGLD-bd4d79', {redirect: 'error', signal: AbortSignal.timeout(10000)});
    if (!response.ok) throw Error('Market provider unavailable.');
    return reply(200, {pair: marketPair(await response.json())});
  } catch {
    return reply(502, {error: 'Live BONEZ market data is temporarily unavailable.'});
  }
}
