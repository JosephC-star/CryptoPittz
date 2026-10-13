import { BONEZ_TOKEN, burnAtomic } from './amounts.js';
export const BURN_PILE_ADDRESS = 'erd106gc0ksmtlrarpqrvjhyrv2rt9wawv4u3czx4w7xuj40s5sxpxjqyd94s9';
// Public key decoded from the checksum-validated address, also matched to the simulation event.
export const BURN_PILE_TOPIC = 'fpGH2htfx9GEA2SuQbFDWV3XMryOBGq7xuSq+FIGCaQ=';
function bytes(amount) { let hex = BigInt(amount).toString(16); if (hex.length % 2) hex = '0' + hex; return btoa(hex.match(/../g).map(value => String.fromCharCode(parseInt(value, 16))).join('')); }
export function contributionSpec(address, amount) {
  if (!/^erd1[a-z0-9]{58}$/.test(address)) throw Error('Connect your mainnet wallet.');
  if (address === BURN_PILE_ADDRESS) throw Error('The team burn wallet cannot contribute to itself.');
  const n = burnAtomic(amount), hex = n.toString(16).padStart(Math.ceil(n.toString(16).length / 2) * 2, '0');
  return { sender: address, receiver: BURN_PILE_ADDRESS, value: '0', data: `ESDTTransfer@424f4e455a2d666639613733@${hex}`, gasLimit: 500000, gasPrice: 1000000000, chainID: '1', version: 2 };
}
function assertEvent(events, spec) {
  if (spec.receiver !== BURN_PILE_ADDRESS || !/^ESDTTransfer@424f4e455a2d666639613733@(?:[0-9a-f]{2})+$/.test(spec.data) || BigInt('0x' + spec.data.split('@')[2]) <= 0n) throw Error('Contribution destination or payload could not be verified.');
  if (events.some(event => event.identifier === 'signalError') || !events.some(event => event.identifier === 'ESDTTransfer' && event.address === spec.sender && event.topics?.[0] === btoa(BONEZ_TOKEN) && event.topics?.[1] === '' && event.topics?.[2] === bytes(BigInt('0x' + spec.data.split('@')[2])) && event.topics?.[3] === BURN_PILE_TOPIC)) throw Error('The exact BONEZ transfer to the team burn wallet could not be verified.');
}
export function assertContributionSimulation(data, spec) {
  const result = data?.data?.result;
  const shards = result?.receiverShard ? [result.receiverShard, ...(result.senderShard ? [result.senderShard] : [])] : [result];
  if (data?.code !== 'successful' || shards.some(shard => !shard || shard.status !== 'success')) throw Error('Contribution verification failed. No transaction was signed or sent.');
  assertEvent(shards.flatMap(shard => shard.logs?.events || []), spec);
  return result;
}
export function assertContributionReceipt(tx, review) {
  const spec = contributionSpec(review.address, review.amount);
  if (review.kind !== 'contribution' || review.recipient !== BURN_PILE_ADDRESS || tx.status !== 'success' || tx.sender !== spec.sender || tx.receiver !== spec.receiver || String(tx.value) !== '0' || tx.data !== btoa(spec.data)) throw Error('Contribution receipt could not be verified. Check this transaction on Explorer.');
  assertEvent(tx.logs?.events || [], spec);
  return tx;
}
