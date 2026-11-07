import {Address} from '@multiversx/sdk-core/out/core/address.js';
import {getAccount} from '@multiversx/sdk-dapp/out/methods/account/getAccount';
import {getNetworkConfig} from '@multiversx/sdk-dapp/out/methods/network/getNetworkConfig';
import {getAccountProvider} from '@multiversx/sdk-dapp/out/providers/helpers/accountProvider';
import {TransactionManager} from '@multiversx/sdk-dapp/out/managers/TransactionManager/TransactionManager';
import {buildTransaction, json} from '../xoxno/trade';
import {assertSimulation, checkTransaction} from '../xoxno/validation';
import {delistSpec, matchesWithdrawal} from './delistSpec.mjs';

export const delistingEnabled = import.meta.env.VITE_OOX_TRANSACTIONS === 'true' ||
  import.meta.env.VITE_PITTZ_DELIST_PREVIEW === 'true';

function assertWallet(address) {
  if (!delistingEnabled || getAccount().address !== address || getNetworkConfig().network.chainId !== '1') {
    throw Error('Connect the listing wallet on mainnet to delist.');
  }
}

async function verifySimulation(tx, spec, listing) {
  let result;
  try {
    result = assertSimulation(await json('https://api.multiversx.com/transaction/simulate?checkSignature=false', {
      ...tx.toSendable(), signature: '0'.repeat(128),
    }));
  } catch {
    throw Error('The network could not simulate this delisting. Refresh the listing and try again.');
  }
  const events = [result, result.senderShard, result.receiverShard].flatMap(shard => shard?.logs?.events ?? []);
  const walletBytes = btoa(String.fromCharCode(...Address.newFromBech32(spec.sender).getPublicKey()));
  if (!matchesWithdrawal(events, spec, listing, walletBytes)) {
    throw Error('The simulation did not confirm this Pitt would return to your wallet. Delisting stopped.');
  }
}

let inFlight = false;
export async function delist(marketplace, listing, address) {
  if (inFlight) throw Error('A delisting is already in progress.');
  inFlight = true;
  let broadcast = false;
  try {
    assertWallet(address);
    const spec = delistSpec(marketplace, listing, address);
    const account = await json(`https://api.multiversx.com/accounts/${address}`);
    if (!Number.isSafeInteger(account.nonce) || account.nonce < 0 || account.isGuarded) {
      throw Error('This wallet configuration could not be verified for delisting.');
    }
    if (BigInt(account.balance) < BigInt(spec.gasLimit) * BigInt(spec.gasPrice)) {
      throw Error('You need enough EGLD to cover the network fee.');
    }
    const tx = buildTransaction(spec, account.nonce);
    checkTransaction(tx, spec);
    await verifySimulation(tx, spec, listing);
    assertWallet(address);
    const signed = await getAccountProvider().signTransactions([tx]);
    if (signed?.length !== 1) throw Error('Signing was cancelled.');
    checkTransaction(signed[0], spec);
    if (signed[0].nonce !== BigInt(account.nonce)) throw Error('Wallet nonce changed. Review the delisting again.');
    await verifySimulation(signed[0], spec, listing);
    assertWallet(address);
    const manager = TransactionManager.getInstance();
    broadcast = true;
    const sent = await manager.send(signed);
    const hash = sent?.[0]?.hash;
    if (!/^[a-f0-9]{64}$/i.test(hash ?? '')) throw Error('No transaction hash returned.');
    try { await manager.track(sent); } catch { /* Already sent. */ }
    return hash;
  } catch (error) {
    if (broadcast) throw Error('Submission status is uncertain. Check your wallet history before trying again.');
    throw error;
  } finally {
    inFlight = false;
  }
}

export async function checkDelisting(hash, marketplace, listing, address) {
  const tx = await json(`https://api.multiversx.com/transactions/${hash}?withLogs=true&withResults=true`);
  if (['fail', 'invalid'].includes(tx.status)) return 'failed';
  const spec = delistSpec(marketplace, listing, address);
  if (tx.status !== 'success' || tx.sender !== spec.sender || tx.receiver !== spec.receiver ||
      tx.value !== spec.value || tx.data !== btoa(spec.data)) return 'pending';
  const events = [tx, ...(tx.results ?? [])].flatMap(result => result.logs?.events ?? []);
  const walletBytes = btoa(String.fromCharCode(...Address.newFromBech32(address).getPublicKey()));
  if (!matchesWithdrawal(events, spec, listing, walletBytes)) return 'pending';
  const owned = await json(`https://api.multiversx.com/accounts/${address}/nfts/${listing.identifier}`);
  return owned.identifier === listing.identifier ? 'confirmed' : 'pending';
}
