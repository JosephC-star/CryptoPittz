// Browser-local mock ledger. All quantities are millionths of practice BONEZ.
const amount = value => {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value)) throw Error('Invalid atomic amount.');
  return BigInt(value);
};

export function validateSnapshot(snapshot) {
  if (snapshot.mode !== 'practice-only' || !snapshot.id || !Array.isArray(snapshot.wallets) ||
      !Number.isSafeInteger(snapshot.open) || !Number.isSafeInteger(snapshot.deadline) ||
      snapshot.open >= snapshot.deadline) throw Error('Invalid practice snapshot.');
  const wallets = new Set();
  let allocated = 0n;
  for (const row of snapshot.wallets) {
    if (!/^erd1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{58}$/.test(row.wallet) ||
        wallets.has(row.wallet) || !Number.isSafeInteger(row.eligible) || row.eligible < 0) {
      throw Error('Invalid or duplicate snapshot wallet.');
    }
    wallets.add(row.wallet);
    const value = amount(row.amountAtomic);
    if ((row.eligible === 0) !== (value === 0n)) throw Error('Eligibility does not match allocation.');
    allocated += value;
  }
  if (allocated + amount(snapshot.unallocatedAtomic) !== amount(snapshot.budgetAtomic)) {
    throw Error('Snapshot budget does not reconcile.');
  }
  return snapshot;
}

export function emptyLedger(snapshot) {
  return {snapshotId: snapshot.id, receipts: {}};
}

export function accounting(snapshot, ledger, now) {
  if (!Number.isSafeInteger(now) || ledger.snapshotId !== snapshot.id ||
      !ledger.receipts || Array.isArray(ledger.receipts)) throw Error('Invalid practice ledger.');
  const allocations = new Map(snapshot.wallets.map(row => [row.wallet, row]));
  let claimed = 0n;
  for (const [wallet, receipt] of Object.entries(ledger.receipts)) {
    const row = allocations.get(wallet);
    if (!row || receipt.wallet !== wallet || receipt.amountAtomic !== row.amountAtomic ||
        !Number.isSafeInteger(receipt.timestamp) ||
        receipt.timestamp < snapshot.open || receipt.timestamp >= snapshot.deadline) {
      throw Error('Saved claim conflicts with this snapshot.');
    }
    claimed += amount(receipt.amountAtomic);
  }
  const unallocated = amount(snapshot.unallocatedAtomic);
  const remaining = amount(snapshot.budgetAtomic) - unallocated - claimed;
  const expired = now >= snapshot.deadline ? remaining : 0n;
  return {claimed, claimable: remaining - expired, expired, unallocated};
}

export function claim(snapshot, ledger, wallet, now) {
  accounting(snapshot, ledger, now);
  if (now < snapshot.open) throw Error('The practice claim window has not opened.');
  if (now >= snapshot.deadline) throw Error('The practice claim window is closed.');
  const row = snapshot.wallets.find(row => row.wallet === wallet);
  if (!row || amount(row.amountAtomic) === 0n) throw Error('This wallet has no eligible allocation.');
  if (Object.hasOwn(ledger.receipts, wallet)) throw Error('This wallet already claimed. Its saved receipt is available.');
  const receipt = {wallet, amountAtomic: row.amountAtomic, timestamp: now};
  return {
    snapshotId: snapshot.id,
    receipts: {...ledger.receipts, [wallet]: receipt},
  };
}
