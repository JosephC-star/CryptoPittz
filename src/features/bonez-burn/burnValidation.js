import { BONEZ_TOKEN, burnAtomic } from './amounts.js';
export function burnSpec(address, amount) {
  if (!/^erd1[a-z0-9]{58}$/.test(address)) throw Error('Connect your mainnet wallet.');
  const n = burnAtomic(amount);
  const hex = n.toString(16).padStart(Math.ceil(n.toString(16).length / 2) * 2, '0');
  return { sender: address, receiver: address, value: '0', data: `ESDTLocalBurn@424f4e455a2d666639613733@${hex}`, gasLimit: 3000000, gasPrice: 1000000000, chainID: '1', version: 2 };
}
export function assertBurnSimulation(data) {
  const result = data?.data?.result;
  const shards = result?.receiverShard ? [result.receiverShard, ...(result.senderShard ? [result.senderShard] : [])] : [result];
  if (data?.code !== 'successful' || shards.some(s => !s || s.status !== 'success' || s.logs?.events?.some(e => e.identifier === 'signalError'))) throw Error('Direct BONEZ burning could not be verified for this wallet. A burn role or compatible burn contract may be needed. No transaction was signed.');
  return result;
}
export function assertBurnReceipt(tx, review) {
  const spec = burnSpec(review.address, review.amount);
  if (tx.status !== 'success' || tx.sender !== spec.sender || tx.receiver !== spec.receiver || String(tx.value) !== '0' || tx.data !== btoa(spec.data)) throw Error('The burn receipt could not be verified. Check this transaction on Explorer.');
  return tx;
}
export { BONEZ_TOKEN };
