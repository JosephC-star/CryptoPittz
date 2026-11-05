import test from 'node:test';
import assert from 'node:assert/strict';
import {schedule,RESERVE,DAY,allocate,splitClaims,lpReward,addMonths} from '../public/staking-preview/model.js';
test('every weekly allocation sums to the exact 33 million reserve across different launches',()=>{for(const start of ['2026-11-11','2028-02-23','2030-01-30']){const p=schedule(start);assert.equal(p.weeks.reduce((s,w)=>s+w.budget,0n),RESERVE);assert.equal(Math.round((p.end-p.start)/DAY),2301);assert(p.weeks.every(w=>w.budget>0n));assert.equal(p.weeks.at(-1).close,p.end);}});
test('calendar halving clamps month ends and crossing weeks integrate both rates',()=>{assert.equal(new Date(addMonths(Date.parse('2028-05-31T00:00:00Z'),9)).toISOString().slice(0,10),'2029-02-28');const p=schedule();const boundary=p.phases[2].start;const w=p.weeks.find(w=>w.open<boundary&&w.close>boundary);assert(w);assert.equal(w.weight,BigInt(boundary-w.open)*128n+BigInt(w.close-boundary)*64n);});
test('only eligible NFTs split the full budget, including duplicate ranks and the Vice bonus', () => {
  const snapshot = schedule().start;
  const og = {collection: 'original', nonce: 1, rank: 500, heldSince: snapshot - 2 * DAY, listed: false};
  const holdings = [
    og, {...og, nonce: 2}, {...og, collection: 'vice', rank: 150},
    {...og, nonce: 3, listed: true}, {...og, nonce: 4, heldSince: og.heldSince + 1},
  ];
  const result = allocate(160n, snapshot, holdings);
  assert.deepEqual(result.rows.map(row => row.amount), [50n, 50n, 60n, 0n, 0n]);
  assert.equal(allocate(161n, snapshot, holdings).rows.reduce((sum, row) => sum + row.amount, 0n), 161n);
  assert.equal(allocate(160n, snapshot, holdings.slice(3)).unallocated, 160n);
  assert.throws(() => allocate(160n, snapshot, [og, og]));
});
test('claim times follow midnight Central across daylight saving', () => {
  const {weeks} = schedule();
  assert.equal(new Date(weeks[0].open).toISOString(), '2026-11-18T06:00:00.000Z');
  assert.equal(new Date(weeks[0].deadline).toISOString(), '2026-11-24T06:00:00.000Z');
  const transition = schedule('2027-03-10').weeks[0];
  assert.equal(new Date(transition.deadline).toISOString(), '2027-03-16T05:00:00.000Z');
});
test('claim split conserves budget and LP weighting respects amount and duration',()=>{for(const n of [0,1,80,100]){const s=splitClaims(123456789n,n);assert.equal(s.claimed+s.expired,123456789n);}assert.equal(lpReward(1000n,100,7,700),500n);assert.equal(lpReward(1000n,100,0,700),0n);assert.equal(lpReward(1000n,0,0,0),0n);assert.throws(()=>lpReward(1000n,100,8,100));});
