// Display only: transaction amounts and wallet reviews retain exact atomic units.
export function compactNftPrice(value, atomic = false) {
  let whole, digit;
  if (atomic) {
    const n = BigInt(value);
    whole = (n / 10n ** 18n).toString();
    digit = ((n % 10n ** 18n) / 10n ** 17n).toString();
  } else {
    const text = String(value);
    if (!/^\d+(?:\.\d+)?$/.test(text)) return text;
    const parts = text.split('.'); whole = parts[0]; digit = (parts[1] || '0')[0];
  }
  if (whole === '0' && digit === '0' && Number(value) > 0) return '<0.1';
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + digit;
}
