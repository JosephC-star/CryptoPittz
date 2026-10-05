import { Buffer } from 'buffer';
export async function loadPreview() {
  // sdk-core's transaction codecs use the Node-compatible Buffer API.
  globalThis.Buffer ??= Buffer;
  return import.meta.env.VITE_OOX_TRANSACTIONS === 'true' ? import('./OoxTradePanel') : import('./OoxPurchasePreview');
}

export async function loadMyListings() {
  globalThis.Buffer ??= Buffer;
  return import('./MyListings');
}
