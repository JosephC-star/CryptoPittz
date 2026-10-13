export const BONEZ_TOKEN = 'BONEZ-ff9a73';
export const BONEZ_DECIMALS = 6;
export function burnAtomic(value) {
  if (typeof value !== 'string' || !/^\d{1,30}(\.\d{1,6})?$/.test(value.trim())) throw Error('Enter a positive amount with up to 6 decimal places.');
  const [whole, fraction = ''] = value.trim().split('.');
  const amount = BigInt(whole + fraction.padEnd(6, '0'));
  if (amount <= 0n) throw Error('Enter an amount greater than zero.');
  return amount;
}
export function bonezHuman(raw) {
  if (!/^\d{1,80}$/.test(String(raw))) throw Error('Invalid BONEZ balance.');
  const s = BigInt(raw).toString().padStart(7, '0');
  const fraction = s.slice(-6).replace(/0+$/, '');
  return s.slice(0, -6) + (fraction ? '.' + fraction : '');
}
export function validateBurnToken(token) {
  if (token?.identifier !== BONEZ_TOKEN || token.decimals !== BONEZ_DECIMALS || token.type !== 'FungibleESDT') throw Error('BONEZ token details could not be verified.');
  bonezHuman(token.burnt);
  if (!/^\d+(\.\d+)?$/.test(String(token.supply))) throw Error('BONEZ supply could not be verified.');
  return token;
}
