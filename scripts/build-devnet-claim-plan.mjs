// Usage: node scripts/build-devnet-claim-plan.mjs OWNER_WALLET SECOND_TEST_WALLET CONTRACT TEST_TOKEN
// Produces unsigned devnet call specifications, not signable transactions with stale nonces.
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {decodeAddress} from './prepare-devnet-claim.mjs';
const hex = value => {
  const h = BigInt(value).toString(16);
  return h.padStart(h.length + h.length % 2, '0');
};
const text = value => Buffer.from(value).toString('hex');
const holder = address => !decodeAddress(address).subarray(0, 8).every(value => value === 0);
export function buildPlan({owner, secondWallet, contract, token, now = Math.floor(Date.now()/1000)}) {
  if (!holder(owner) || !holder(secondWallet) || holder(contract) || owner === secondWallet) {
    throw Error('Provide two different holder wallets and a deployed contract.');
  }
  if (!/^PITTZTEST-[0-9a-f]{6}$/.test(token) || !Number.isSafeInteger(now) || now < 0) {
    throw Error('Provide a PITTZTEST token and valid clock.');
  }
  const opens = now + 1200, deadline = opens + 600;
  const allocations = [{wallet: owner, amountAtomic: '60000000'}, {wallet: secondWallet, amountAtomic: '40000000'}];
  const manifest = {mode: 'devnet-only', chainID:'D', contract, token, cycle:1, opens, deadline, allocations};
  const manifestHash = createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
  const spec = (sender, data) => ({sender, receiver:contract, value:'0', chainID:'D', gasPrice:1000000000, gasLimit:20000000, data});
  return {...manifest, manifestHash, steps: [
    {label:'Fund test cycle', ...spec(owner,['ESDTTransfer',text(token),hex(100000000),text('createCycle'),hex(1),hex(opens),hex(deadline),manifestHash].join('@'))},
    {label:'Publish two test allocations', ...spec(owner,['addAllocations',hex(1),
      decodeAddress(owner).toString('hex'),hex(60000000),decodeAddress(secondWallet).toString('hex'),hex(40000000)].join('@'))},
    {label:'Seal the fully allocated cycle', ...spec(owner,'sealCycle@01')},
    {label:'First test claim', ...spec(owner,'claim@01')},
    {label:'Second test claim', ...spec(secondWallet,'claim@01')},
    {label:'Classify expiration at the deadline', ...spec(owner,'expireCycle@01')},
  ]};
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [owner,secondWallet,contract,token] = process.argv.slice(2);
  console.log(JSON.stringify(buildPlan({owner,secondWallet,contract,token}),null,2));
}
