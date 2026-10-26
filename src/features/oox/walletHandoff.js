// The SDK exposes its strategy but not a signing deep-link API. Keep the
// feature-detected WalletConnect access here; signing works if it changes.
export function xPortalLink(metadata) {
  if (!/^(xportal|maiar)(\s|$)/i.test(metadata?.name || '')) return null;
  for (const value of [metadata.redirect?.native, metadata.redirect?.universal]) {
    try {
      const url = new URL(value);
      if (['xportal:', 'maiar:'].includes(url.protocol) ||
          (url.protocol === 'https:' && url.hostname === 'xportal.app.link')) return url.href;
    } catch { /* Ignore missing or invalid wallet metadata. */ }
  }
  return 'https://xportal.app.link/';
}

export function watchWalletHandoff(provider, onReady, browser = globalThis.window) {
  if (provider.getType?.() !== 'walletConnect' || !browser ||
      !/Android|iPhone|iPad|iPod/i.test(browser.navigator?.userAgent || '')) return () => {};
  const wallet = provider.getProvider?.()?.provider;
  const connector = wallet?.walletConnector;
  const topic = wallet?.session?.topic;
  const link = xPortalLink(wallet?.session?.peer?.metadata);
  if (!link || !topic || !connector?.on || !connector?.off) return () => {};
  let opened = false;
  const listener = event => {
    if (opened || event?.topic !== topic || event?.request?.method !== 'mvx_signTransactions') return;
    opened = true;
    onReady(link);
    if (browser.document?.visibilityState === 'hidden') return;
    try {
      if (new URL(link).protocol === 'https:') browser.open(link, '_blank', 'noopener,noreferrer');
      else browser.location.assign(link);
    } catch { /* The explicit link remains available if the browser blocks us. */ }
  };
  connector.on('session_request_sent', listener);
  return () => connector.off('session_request_sent', listener);
}
