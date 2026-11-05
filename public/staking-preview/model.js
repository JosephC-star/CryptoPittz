export const RESERVE = 33_000_000_000_000n;
export const DAY = 86400000;
export const TIERS = ['Secret Rare', 'Holoz', 'Lego', 'Platinum', 'Gold', 'Silver', 'Bronze'];
// Draft relative weights inferred from the original announcement's daily rates.
export const WEIGHTS = [100, 50, 25, 12, 6, 3, 1];
export const COUNTS = { original: [4, 15, 50, 494, 786, 1625, 2336], vice: [1, 5, 11, 100, 200, 400, 678] };
const CENTRAL_OFFSET = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago', timeZoneName: 'shortOffset',
});
const centralMidnight = day => {
  const offset = CENTRAL_OFFSET.formatToParts(day + 6 * 3600000)
    .find(part => part.type === 'timeZoneName').value;
  return day - Number(offset.slice(3)) * 3600000;
};
const RANK_MAX = {
  original: [1, 2, 3, 451, 1245, 3195, 6969],
  vice: [1, 2, 3, 104, 298, 701, 1387],
};
export function addMonths(start, months) {
  const date = new Date(start), day = date.getUTCDate();
  date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + months);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last)); return date.getTime();
}
export function schedule(iso = '2026-11-18') {
  const startDay = Date.parse(`${iso}T00:00:00Z`);
  if (new Date(startDay).getUTCDay() !== 3) throw Error('Choose a Wednesday.');
  // Round 6.3 average Gregorian years to 2,301 Central calendar days.
  const endDay = startDay + 2301 * DAY;
  const start = centralMidnight(startDay), end = centralMidnight(endDay);
  const phases = Array.from({length: 9}, (_, i) => ({
    start: centralMidnight(addMonths(startDay, i * 9)),
    end: centralMidnight(Math.min(addMonths(startDay, (i + 1) * 9), endDay)),
    factor: 256n >> BigInt(i),
  })).filter(p => p.start < end);
  const weeks = [];
  for (let day = startDay; day < endDay; day += 7 * DAY) {
    const open = centralMidnight(day);
    const close = centralMidnight(Math.min(day + 7 * DAY, endDay));
    const deadline = centralMidnight(day + 6 * DAY);
    const weight = phases.reduce((sum, p) => sum + BigInt(Math.max(0, Math.min(close, p.end) - Math.max(open, p.start))) * p.factor, 0n);
    weeks.push({open, close, deadline, weight});
  }
  const denominator = weeks.reduce((sum, w) => sum + w.weight, 0n);
  let assigned = 0n;
  for (const week of weeks) { week.budget = RESERVE * week.weight / denominator; week.remainder = RESERVE * week.weight % denominator; assigned += week.budget; }
  const ranked = [...weeks].sort((a, b) => a.remainder > b.remainder ? -1 : a.remainder < b.remainder ? 1 : a.open - b.open);
  for (let i = 0; i < Number(RESERVE - assigned); i++) ranked[i].budget += 1n;
  return {start, end, phases, weeks};
}
export function allocate(budget, snapshot, holdings) {
  const seen = new Set();
  const rows = holdings.map(holding => {
    const {collection, nonce, rank, listed, heldSince} = holding;
    const id = `${collection}:${nonce}`;
    const tier = RANK_MAX[collection]?.findIndex(max => rank <= max);
    if (seen.has(id) || !Number.isSafeInteger(nonce) || nonce < 1 ||
        !Number.isInteger(rank) || rank < 1 || !(tier >= 0) ||
        typeof listed !== 'boolean' || !Number.isFinite(heldSince) || heldSince > snapshot) {
      throw Error('Invalid or duplicate snapshot holding.');
    }
    seen.add(id);
    const status = listed ? 'Listed' : heldSince > snapshot - 2 * DAY ? 'Held under 48 hours' : 'Eligible';
    const weight = BigInt(WEIGHTS[tier] * (collection === 'vice' ? 6 : 5));
    return {...holding, id, tier, status, weight, amount: 0n};
  });
  const eligible = rows.filter(row => row.status === 'Eligible');
  const denominator = eligible.reduce((sum, row) => sum + row.weight, 0n);
  if (!denominator) return {rows, allocated: 0n, unallocated: budget};
  let leftover = budget;
  const ranked = eligible.map(row => {
    const weighted = budget * row.weight;
    row.amount = weighted / denominator;
    leftover -= row.amount;
    return {row, remainder: weighted % denominator};
  }).sort((a, b) => {
    if (a.remainder !== b.remainder) return a.remainder > b.remainder ? -1 : 1;
    return a.row.id.localeCompare(b.row.id, 'en-US');
  });
  for (let i = 0; i < Number(leftover); i++) ranked[i].row.amount++;
  return {rows, allocated: budget, unallocated: 0n};
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
export function format(value) { return (Number(value) / 1e6).toLocaleString('en-US', {maximumFractionDigits: 6}); }
