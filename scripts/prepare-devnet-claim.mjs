// Prepare one unsigned claim using live devnet state. This script never signs or broadcasts.
import {pathToFileURL} from 'node:url';
const API = 'https://devnet-api.multiversx.com';
const GATEWAY = 'https://devnet-gateway.multiversx.com';

export function decodeAddress(address) {
  if (typeof address !== 'string' || !/^erd1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{58}$/.test(address)) throw Error('Invalid address.');
  const alphabet = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  const values = [...address.slice(4)].map(char => alphabet.indexOf(char));
  const expanded = [...'erd'].map(char => char.charCodeAt(0) >> 5).concat([0], [...'erd'].map(char => char.charCodeAt(0) & 31), values);
  let checksum = 1;
  for (const value of expanded) {
    const top = checksum >>> 25;
    checksum = ((checksum & 0x1ffffff) << 5) ^ value;
    for (let i = 0; i < 5; i++) if ((top >>> i) & 1) checksum ^= [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3][i];
  }
  if (checksum !== 1) throw Error('Invalid address checksum.');
  const bits = values.slice(0, -6).map(value => value.toString(2).padStart(5, '0')).join('');
  if (!/^0*$/.test(bits.slice(256))) throw Error('Invalid address padding.');
  return Buffer.from(Array.from({length: 32}, (_, i) => parseInt(bits.slice(i * 8, i * 8 + 8), 2)));
}
const isContract = bytes => bytes.subarray(0, 8).every(value => value === 0);
const hexInteger = value => {
  const h = BigInt(value).toString(16);
  return h.padStart(h.length + h.length % 2, '0');
};
const atomic = value => value.length ? BigInt('0x' + Buffer.from(value, 'base64').toString('hex')) : 0n;

export async function prepareDevnetClaim({wallet, contract, token, cycle}, get = async url => {
  const response = await fetch(url);
  if (!response.ok) throw Error('Devnet read failed: ' + response.status);
  return response.json();
}, query = async body => {
  const response = await fetch(GATEWAY + '/vm-values/query', {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body),
  });
  if (!response.ok) throw Error('Devnet query failed: ' + response.status);
  const result = await response.json();
  if (result.code !== 'successful' || result.data?.data?.returnCode !== 'ok') throw Error('Devnet contract query failed.');
  return result.data.data.returnData;
}) {
  if (isContract(decodeAddress(wallet)) || !isContract(decodeAddress(contract))) throw Error('Select a holder wallet and contract.');
  if (!/^PITTZTEST-[0-9a-f]{6}$/.test(token) || !/^[1-9][0-9]*$/.test(String(cycle))) throw Error('Specify the test token and positive cycle.');
  if (BigInt(cycle) > 18446744073709551615n) throw Error('Cycle exceeds the contract range.');
  const c = hexInteger(cycle);
  const walletHex = decodeAddress(wallet).toString('hex');
  const vm = (funcName, args = [c]) => query({scAddress: contract, funcName, args});
  const [network, account, contractAccount, tokenInfo, configured, allocation, claimed, sealed, opens, deadline] = await Promise.all([
    get(GATEWAY + '/network/config'), get(API + '/accounts/' + wallet), get(API + '/accounts/' + contract),
    get(API + '/tokens/' + token), vm('getRewardToken', []),
    vm('getAllocation', [c, walletHex]), vm('hasClaimed', [c, walletHex]), vm('isSealed'), vm('getOpens'), vm('getDeadline'),
  ]);
  if (network.data?.config?.erd_chain_id !== 'D') throw Error('Devnet chain D required.');
  if (!contractAccount.codeHash) throw Error('Contract code is missing.');
  if (tokenInfo.identifier !== token || tokenInfo.decimals !== 6) throw Error('Use a six-decimal test token.');
  if (Buffer.from(configured[0] || '', 'base64').toString() !== token) throw Error('Contract token does not match.');
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (atomic(allocation[0] || '') <= 0n || atomic(claimed[0] || '') !== 0n) throw Error('No unclaimed allocation.');
  if (atomic(sealed[0] || '') !== 1n || now < atomic(opens[0] || '') || now >= atomic(deadline[0] || '')) throw Error('Claim window is unavailable.');
  if (!Number.isSafeInteger(account.nonce) || account.nonce < 0) throw Error('Invalid devnet wallet nonce.');
  const gasLimit = 12000000, gasPrice = 1000000000;
  if (BigInt(account.balance) < BigInt(gasLimit) * BigInt(gasPrice)) throw Error('Fund the devnet wallet with test EGLD for fees.');
  return {nonce: account.nonce, value: '0', receiver: contract, sender: wallet, gasPrice, gasLimit,
    data: Buffer.from('claim@' + c).toString('base64'), chainID: 'D', version: 1};
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [wallet, contract, token, cycle] = process.argv.slice(2);
  const tx = await prepareDevnetClaim({wallet, contract, token, cycle});
  console.log(JSON.stringify(tx, null, 2));
}
