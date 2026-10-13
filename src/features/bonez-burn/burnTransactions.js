import { getAccount } from '@multiversx/sdk-dapp/out/methods/account/getAccount';
import { getNetworkConfig } from '@multiversx/sdk-dapp/out/methods/network/getNetworkConfig';
import { getAccountProvider } from '@multiversx/sdk-dapp/out/providers/helpers/accountProvider';
import { TransactionManager } from '@multiversx/sdk-dapp/out/managers/TransactionManager/TransactionManager';
import { addressHex, getJson, buildTransaction, checkTransaction } from '../bonez-swap/transactions.js';
import { guardianForAccount, withGuardian, assertGuardianUnchanged } from '../bonez-swap/guarded.js';
import { BONEZ_TOKEN, burnAtomic, validateBurnToken } from './amounts.js';
import { contributionSpec, assertContributionSimulation, BURN_PILE_ADDRESS } from './contributionValidation.js';
const key = address => 'pittensor-burn-pending-' + address;
let inFlight = false;
function context(expected) {
  const address = getAccount().address;
  if (!address || expected && address !== expected) throw Error('Wallet changed. Review the contribution again.');
  if (getNetworkConfig().network.chainId !== '1') throw Error('Connect a mainnet wallet.');
  addressHex(address); return address;
}
export function pendingContribution(address) { try { return JSON.parse(sessionStorage.getItem(key(address)) || 'null'); } catch { throw Error('Pending transaction data is unavailable. Check wallet history before continuing.'); } }
async function previous(address) {
  const pending = pendingContribution(address);
  if (!pending) return;
  if (!/^[a-f0-9]{64}$/.test(pending.hash || '')) throw Error('Previous submission is uncertain. Check wallet history before another contribution.');
  let tx; try { tx = await getJson(`https://api.multiversx.com/transactions/${pending.hash}`); } catch { throw Error('Previous transaction is still being indexed. Wait for its receipt.'); }
  if (!['success', 'fail', 'invalid'].includes(tx.status)) throw Error('Wait for your previous transaction to finish.');
  sessionStorage.removeItem(key(address));
}
async function funds(address, amount, guardian, verifyGuardian = false) {
  const [account, balance, token] = await Promise.all([
    getJson(`https://api.multiversx.com/accounts/${address}?withGuardianInfo=true`),
    getJson(`https://api.multiversx.com/accounts/${address}/tokens/${BONEZ_TOKEN}`, undefined, true),
    getJson(`https://api.multiversx.com/tokens/${BONEZ_TOKEN}`)
  ]);
  validateBurnToken(token);
  addressHex(BURN_PILE_ADDRESS);
  if (balance && balance.identifier !== BONEZ_TOKEN) throw Error('Wallet BONEZ token could not be verified.');
  if (token.isPaused) throw Error('BONEZ is paused. Contributions are unavailable.');
  if (!Number.isSafeInteger(account.nonce)) throw Error('Unable to verify wallet nonce.');
  if (BigInt(balance?.balance || '0') < burnAtomic(amount)) throw Error('Insufficient liquid BONEZ.');
  if (verifyGuardian) assertGuardianUnchanged(account, guardian, addressHex);
  const protection = guardianForAccount(account, addressHex), spec = withGuardian(contributionSpec(address, amount), protection);
  if (BigInt(account.balance) < BigInt(spec.gasLimit) * BigInt(spec.gasPrice)) throw Error('Leave enough EGLD for the maximum network fee.');
  return { account, guardian: protection, spec };
}
async function simulateContribution(tx) {
  const payload = { ...tx.toSendable(), signature: '0'.repeat(128), ...(tx.guardian?.toBech32() && tx.options & 2 ? { guardianSignature: '0'.repeat(128) } : {}) };
  const response = await fetch('https://api.multiversx.com/transaction/simulate?checkSignature=false', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw Error('Contribution verification is temporarily unavailable. This contribution has not been submitted.');
  return assertContributionSimulation(await response.json(), {sender: tx.sender.toBech32(), receiver: tx.receiver.toBech32(), data: atob(tx.toSendable().data)});
}
export async function prepareContribution(amount) {
  const address = context(); await previous(address);
  const f = await funds(address, amount), tx = buildTransaction(f.spec, f.account.nonce);
  checkTransaction(tx, f.spec); await simulateContribution(tx); context(address);
  return { kind: 'contribution', recipient: BURN_PILE_ADDRESS, address, amount, spec: f.spec, guardian: f.guardian, created: Date.now(), feeCap: (BigInt(f.spec.gasLimit) * BigInt(f.spec.gasPrice)).toString() };
}
export async function submitContribution(review) {
  if (inFlight) throw Error('Another contribution is in progress.');
  inFlight = true; let broadcast = false;
  try {
    if (review.kind !== 'contribution' || review.recipient !== BURN_PILE_ADDRESS) throw Error('Contribution destination changed. Review again.');
    context(review.address); await previous(review.address);
    if (Date.now() - review.created > 60000) throw Error('Review expired. Review the contribution again.');
    const f = await funds(review.address, review.amount, review.guardian, true);
    if (JSON.stringify(f.spec) !== JSON.stringify(review.spec)) throw Error('Contribution review changed. Review again.');
    const tx = buildTransaction(f.spec, f.account.nonce); checkTransaction(tx, f.spec); await simulateContribution(tx); context(review.address);
    if (Date.now() - review.created > 60000) throw Error('Review expired. Review again.');
    const signed = await getAccountProvider().signTransactions([tx]);
    if (signed?.length !== 1) throw Error('Signing was cancelled.');
    checkTransaction(signed[0], f.spec, true); context(review.address);
    if (Date.now() - review.created > 240000) throw Error('Signing took too long. Review again.');
    const latest = await funds(review.address, review.amount, review.guardian, true);
    if (BigInt(latest.account.nonce) !== signed[0].nonce) throw Error('Wallet nonce changed. Review again.');
    await simulateContribution(signed[0]); context(review.address);
    // Persist before broadcasting so reloads and uncertain responses cannot cause a duplicate contribution.
    const pending = { kind: 'contribution', recipient: BURN_PILE_ADDRESS, address: review.address, amount: review.amount, hash: null };
    sessionStorage.setItem(key(review.address), JSON.stringify(pending));
    broadcast = true;
    const manager = TransactionManager.getInstance(), sent = await manager.send(signed);
    const hash = sent?.[0]?.hash;
    if (!/^[a-f0-9]{64}$/.test(hash || '')) throw Error('No transaction hash was returned.');
    pending.hash = hash; sessionStorage.setItem(key(review.address), JSON.stringify(pending));
    try { await manager.track(sent); } catch { /* Never broadcast again because tracking failed. */ }
    return pending;
  } catch (error) {
    if (broadcast) throw Error('Submission status is uncertain. Check wallet history before another contribution.');
    throw error;
  } finally { inFlight = false; }
}
