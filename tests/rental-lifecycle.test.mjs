import test from 'node:test';
import assert from 'node:assert/strict';
import {renewalWindow} from '../shared/rental-lifecycle.mjs';
test('early renewals preserve prepaid time and clamp month-end in UTC',()=>{const term=renewalWindow('2027-01-31T12:34:56Z',1,Date.parse('2027-01-10T00:00:00Z'));assert.equal(term.endsAt,'2027-02-28T12:34:56.000Z');assert.equal(term.expired,false);});
test('expired renewals restart now without charging for lapsed time',()=>{const term=renewalWindow('2026-01-01T00:00:00Z',6,Date.parse('2026-10-19T12:00:00Z'));assert.equal(term.startsAt,'2026-10-19T12:00:00.000Z');assert.equal(term.endsAt,'2027-04-19T12:00:00.000Z');assert.equal(term.expired,true);});
