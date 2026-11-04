// Only add verified, successful BONEZ burn receipts to the ledger. Transfers to
// the team wallet are contributions, not burns. Amounts use six-decimal atomic units.
export function monthlyBurnHistory(ledger, now = new Date()) {
  const { startMonth, receipts } = ledger;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth) || !Array.isArray(receipts)) throw Error('Invalid burn ledger.');
  const endMonth = now.toISOString().slice(0, 7);
  const months = new Map();
  const cursor = new Date(`${startMonth}-01T00:00:00Z`);
  while (cursor.toISOString().slice(0, 7) <= endMonth) {
    const month = cursor.toISOString().slice(0, 7);
    months.set(month, { month, atomic: 0n, cumulativeAtomic: 0n, receipts: [] });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  const hashes = new Set();
  for (const receipt of receipts) {
    const date = new Date(receipt.burnedAt);
    if (!/^[a-f0-9]{64}$/.test(receipt.hash) || hashes.has(receipt.hash) || !/^\d+$/.test(receipt.atomic) || BigInt(receipt.atomic) <= 0n || !Number.isFinite(date.getTime()) || date > now) throw Error('Invalid burn receipt.');
    hashes.add(receipt.hash);
    const row = months.get(date.toISOString().slice(0, 7));
    if (!row) throw Error('Burn receipt outside ledger period.');
    row.atomic += BigInt(receipt.atomic);
    row.receipts.push(receipt);
  }
  let total = 0n;
  return [...months.values()].map(row => ({ ...row, cumulativeAtomic: (total += row.atomic) })).reverse();
}

export function formatBurnAmount(atomic) {
  const digits = atomic.toString().padStart(7, '0');
  const fraction = digits.slice(-6).replace(/0+$/, '');
  return digits.slice(0, -6).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction ? `.${fraction}` : '');
}
