import { Buffer } from 'buffer';
export async function loadPreview() {
  // sdk-core's transaction codecs use the Node-compatible Buffer API.
  globalThis.Buffer ??= Buffer;
  return import('./OoxPurchasePreview');
}
