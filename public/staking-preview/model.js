export const RESERVE = 33_000_000_000_000n;
export const DAY = 86400000;
export const TIERS = ['Secret Rare', 'Holoz', 'Lego', 'Platinum', 'Gold', 'Silver', 'Bronze'];
// Draft relative weights inferred from the original announcement's daily rates.
export const WEIGHTS = [100, 50, 25, 12, 6, 3, 1];
export const COUNTS = { original: [4, 15, 50, 494, 786, 1625, 2336], vice: [1, 5, 11, 100, 200, 400, 678] };
export const TOTAL_WEIGHT = WEIGHTS.reduce((sum, weight, i) => sum + BigInt(weight * (COUNTS.original[i] * 5 + COUNTS.vice[i] * 6)), 0n);
export function addMonths(start, months) {
  const date = new Date(start), day = date.getUTCDate();
  date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + months);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last)); return date.getTime();
}
export function schedule(iso = '2026-11-11') {
  const start = Date.parse(`${iso}T00:00:00Z`);
  if (!Number.isFinite(start)) throw Error('Choose a valid preview date.');
  // Working convention only: round 6.3 Gregorian average years to 2,301 days.
  const end = start + 2301 * DAY;
  const phases = Array.from({length: 9}, (_, i) => ({start: addMonths(start, i * 9), end: Math.min(addMonths(start, (i + 1) * 9), end), factor: 256n >> BigInt(i)})).filter(p => p.start < end);
  const weeks = [];
  for (let open = start; open < end; open += 7 * DAY) {
    const close = Math.min(open + 7 * DAY, end);
    const weight = phases.reduce((sum, p) => sum + BigInt(Math.max(0, Math.min(close, p.end) - Math.max(open, p.start))) * p.factor, 0n);
    weeks.push({open, close, weight});
  }
  const denominator = weeks.reduce((sum, w) => sum + w.weight, 0n);
  let assigned = 0n;
  for (const week of weeks) { week.budget = RESERVE * week.weight / denominator; week.remainder = RESERVE * week.weight % denominator; assigned += week.budget; }
  const ranked = [...weeks].sort((a, b) => a.remainder > b.remainder ? -1 : a.remainder < b.remainder ? 1 : a.open - b.open);
  for (let i = 0; i < Number(RESERVE - assigned); i++) ranked[i].budget += 1n;
  return {start, end, phases, weeks};
}
export function reward(budget, tier, vice = false, quantity = 1) {
  if (!Number.isInteger(tier) || tier < 0 || tier > 6 || !Number.isInteger(quantity) || quantity < 0 || quantity > 10000) throw Error('Invalid sample holding.');
  return budget * BigInt(WEIGHTS[tier] * (vice ? 6 : 5) * quantity) / TOTAL_WEIGHT;
}
export function splitClaims(budget, percentage) {
  if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) throw Error('Invalid claim percentage.');
  const claimed = budget * BigInt(percentage) / 100n;
  return {claimed, expired: budget - claimed};
}
export function lpReward(expired, quantity, days, otherWeight) {
  if (![quantity, days, otherWeight].every(n => Number.isSafeInteger(n) && n >= 0) || days > 7) throw Error('Invalid LP sample.');
  const weight = BigInt(quantity) * BigInt(days), total = weight + BigInt(otherWeight);
  return total ? expired * weight / total : 0n;
}
export function format(value) { return (Number(value) / 1e6).toLocaleString('en-US', {maximumFractionDigits: 2}); }
