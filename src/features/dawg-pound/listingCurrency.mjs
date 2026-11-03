export function matchesListingCurrency(listing, currency = 'all') {
  if (!listing) return false;
  if (currency === 'all') return true;
  if (currency === 'EGLD') return listing.paymentToken === 'EGLD';
  if (currency === 'BONEZ') return listing.paymentToken === 'BONEZ-ff9a73';
  return false;
}
