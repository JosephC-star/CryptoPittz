import { Buffer } from 'buffer';
export async function loadPreview() {
  // sdk-core's transaction codecs use the Node-compatible Buffer API.
  globalThis.Buffer ??= Buffer;
  return import('./MarketplaceTradePanel');
}

export async function loadMyListings() {
  globalThis.Buffer ??= Buffer;
  return import('./MyListings');
}

export async function loadOffersPanel() {
  globalThis.Buffer ??= Buffer;
  return import('./OfferPanel');
}

export async function loadReceivedOffersView() {
  globalThis.Buffer ??= Buffer;
  return import('../my-pittz/MyReceivedOffers');
}
