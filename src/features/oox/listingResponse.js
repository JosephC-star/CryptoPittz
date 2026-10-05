export function readListingItems(page) {
  if (!page || typeof page !== 'object') throw Error('Invalid response from OOX listings API.');
  if (Array.isArray(page.items)) return page.items;
  // The v1 API omits its items field for empty results.
  if (page.total === 0 && page.items === undefined) return [];
  throw Error('OOX returned an unexpected listing response. Please retry later.');
}
