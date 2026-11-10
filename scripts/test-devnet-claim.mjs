import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {decodeAddress, prepareDevnetClaim} from './prepare-devnet-claim.mjs';
const fixture = JSON.parse(await readFile(new URL('../public/staking-preview/claim-fixture.json', import.meta.url)));
const wallet = fixture.wallets.find(row => row.eligible).wallet;
const contract = fixture.wallets.find(row => !row.eligible).wallet;
const token = 'PITTZTEST-123456';
const config = {wallet, contract, token, cycle: '1'};
const encoded = n => Buffer.from(BigInt(n).toString(16).padStart(2, '0'), 'hex').toString('base64');
const get = async url => url.endsWith('network/config') ? {data: {config: {erd_chain_id: 'D'}}} :
  url.includes('/tokens/') ? {identifier: token, decimals: 6} :
  url.endsWith(contract) ? {codeHash: 'devnet-code'} : {nonce: 4, balance: '1000000000000000000'};
const query = async ({funcName}) => {
  const values = {getRewardToken: Buffer.from(token).toString('base64'), getAllocation: encoded(60),
    hasClaimed: '', isSealed: encoded(1), getOpens: encoded(Math.floor(Date.now()/1000)-100),
    getDeadline: encoded(Math.floor(Date.now()/1000)+100)};
  return [values[funcName]];
};
test('checks all fixture addresses and rejects checksum corruption', () => {
  for (const row of fixture.wallets) assert.equal(decodeAddress(row.wallet).length, 32);
  assert.throws(() => decodeAddress(wallet.slice(0,-1)+(wallet.endsWith('q')?'p':'q')), /checksum/);
});
test('prepares only an unsigned, zero-value devnet claim with current nonce', async () => {
  const tx = await prepareDevnetClaim(config, get, query);
  assert.equal(tx.chainID, 'D'); assert.equal(tx.nonce,4);
  assert.equal(tx.value,'0'); assert.equal(tx.signature,undefined);
  assert.equal(Buffer.from(tx.data,'base64').toString(),'claim@01');
});
test('rejects mainnet, the real BONEZ token, missing fees, and duplicate claims', async () => {
  await assert.rejects(prepareDevnetClaim(config, async url => url.endsWith('network/config') ?
    {data:{config:{erd_chain_id:'1'}}} : get(url), query), /chain D/);
  await assert.rejects(prepareDevnetClaim({...config,token:'BONEZ-ff9a73'},get,query), /test token/);
  await assert.rejects(prepareDevnetClaim(config, async url => url.endsWith(wallet) ?
    {nonce:4,balance:'0'} : get(url), query), /test EGLD/);
  await assert.rejects(prepareDevnetClaim(config,get,async body => body.funcName==='hasClaimed' ?
    [encoded(1)] : query(body)), /unclaimed/);
});

const {buildPlan} = await import('./build-devnet-claim-plan.mjs');
test('builds a test-only funded cycle with a ten-minute claim window', () => {
  const secondWallet = fixture.wallets.find(row => row.eligible && row.wallet !== wallet).wallet;
  const plan = buildPlan({owner:wallet,secondWallet,contract,token,now:100});
  assert.equal(plan.deadline-plan.opens,600);
  assert.equal(plan.allocations.reduce((n,row)=>n+BigInt(row.amountAtomic),0n),100000000n);
  assert.ok(plan.steps.every(step=>step.chainID==='D' && !Object.hasOwn(step,'nonce')));
  const parts=plan.steps[0].data.split('@');
  assert.equal(Buffer.from(parts[1],'hex').toString(),token);
  assert.equal(Buffer.from(parts[3],'hex').toString(),'createCycle');
  assert.equal(parts.at(-1),plan.manifestHash);
});
