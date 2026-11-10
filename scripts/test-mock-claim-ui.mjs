// Minimal DOM harness for event wiring. Browser rendering requires a separate check.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {accounting, claim, emptyLedger, validateSnapshot} from '../public/staking-preview/claim-model.js';
const snapshot = JSON.parse(await readFile(new URL('../public/staking-preview/claim-fixture.json', import.meta.url)));
const code = (await readFile(new URL('../public/staking-preview/claim-test.js', import.meta.url),'utf8')).replace(/^import .*;\n/, '');
const elements = new Map();
class Element {
 constructor(){ this.value='';this.textContent='';this.disabled=false;this.checked=false;this.listeners={};this.dataset={}; }
 addEventListener(type,callback){this.listeners[type]=callback;}
 append(option){(this.options??=[]).push(option);}
 async click(){return this.listeners.click?.();}
}
const times=['before','open','last','closed'].map(time=>Object.assign(new Element(),{dataset:{time}}));
const doc={getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},
 createElement(){return new Element();},querySelectorAll(){return times;}};
const storage=new Map();let failWrite=false,tail=Promise.resolve();
const localStorage={getItem:k=>storage.get(k)??null,setItem(k,v){if(failWrite)throw Error('Storage full');storage.set(k,v);},removeItem:k=>storage.delete(k)};
const navigator={locks:{request(k,fn){const next=tail.then(fn);tail=next.catch(()=>{});return next;}}};
const fetch=async()=>({ok:true,json:async()=>snapshot});
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
async function load(){await new AsyncFunction('accounting','claim','emptyLedger','validateSnapshot','document','navigator','localStorage','fetch','addEventListener',code)(accounting,claim,emptyLedger,validateSnapshot,doc,navigator,localStorage,fetch,()=>{});}
const el=id=>doc.getElementById(id);
await load();
await times[0].click();assert.equal(el('claim').disabled,true);
await times[1].click();el('fail-next').checked=true;
await el('claim').click();assert.match(el('message').textContent,/Simulated save failure/);assert.equal(storage.size,0);
failWrite=true;await el('claim').click();assert.match(el('message').textContent,/Storage full/);assert.equal(storage.size,0);failWrite=false;
await Promise.all([el('claim').click(),el('claim').click()]);
assert.equal(Object.keys(JSON.parse([...storage.values()][0]).receipts).length,1);
assert.match(el('claim').textContent,/Already claimed/);
elements.clear();await load();assert.match(el('claim').textContent,/Already claimed/);
await times[3].click();assert.equal(el('claim').disabled,true);assert.notEqual(el('expired-total').textContent,'0.000000');
await el('reset').click();assert.equal(storage.size,0);
el('wallet-select').value=snapshot.wallets.find(row=>!row.eligible).wallet;
el('wallet-select').listeners.change();assert.equal(el('allocation').textContent,'0.000000');assert.equal(el('claim').disabled,true);
console.log('DOM harness PASS: clock controls, simulated failure, storage write failure, concurrent retry, reload, expiry, reset, and ineligible selection.');
