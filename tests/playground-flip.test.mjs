import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {withBonezFlip} from '../scripts/build-playground-flip.mjs';
const root=new URL('../',import.meta.url),vault='cryptopittz-plinko-preview-bonez',journal='cryptopittz-bonez-flip-v1';
const html=await readFile(new URL('public/playground/bonez-flip/index.html',root),'utf8');
const code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
async function game(saved={},random=[0]){
 const data=new Map(Object.entries(saved)),elements=new Map();
 const element=()=>({value:'25',style:{transform:'',setProperty(){}},classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(){},removeAttribute(){},append(){},prepend(){},replaceChildren(){},focus(){},showModal(){},close(){},cloneNode(){return null},offsetTop:100,offsetHeight:100,animate(){return {finished:Promise.resolve(),cancel(){},finish(){}}}});
 const query=s=>{if(!elements.has(s))elements.set(s,element());return elements.get(s);};
 const document={hidden:true,querySelector:query,querySelectorAll:()=>[],createElement:element,body:element(),documentElement:element(),addEventListener(){}};
 const context=vm.createContext({document,localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))},navigator:{locks:{request:async(_key,_options,fn)=>fn(true)}},crypto:{randomUUID:()=>String(Math.random()),getRandomValues:a=>{a[0]=random.shift()??0;return a;}},Audio:class{pause(){}play(){return Promise.resolve()}},matchMedia:()=>({matches:true}),confirm:()=>true,console,setTimeout,clearTimeout,Map,Uint32Array,Uint8Array,Date,Math,Promise,ResizeObserver:class{observe(){}}});
 context.window=context;context.addEventListener=()=>{};
 vm.runInContext(code,context);await new Promise(resolve=>setImmediate(resolve));
 return {data,context,query,run:source=>vm.runInContext(source,context)};
}
test('lobby swaps the rhythm cabinet and route while preserving other games',async()=>{
 const input=await readFile(new URL('public/playground/playground.js',root),'utf8');const output=withBonezFlip(input);
 assert(output.includes('Qr={flip:`BONEZ FLIP`'));assert(output.includes('src:`/playground/bonez-flip/`'));assert(!output.includes('onClick:()=>w(`beat`)'));assert(output.includes('o===`plinko`'));assert.throws(()=>withBonezFlip('incompatible release'),/cabinet changed/);
});
test('practice game has local media and no transaction or wallet path',()=>{
 assert(!html.includes('data:audio'));assert(!html.includes('data:image'));assert(!/sendTransaction|signTransaction|walletConnect|\.supabase\.|render\.com/.test(code));assert(html.includes('No real BONEZ transactions.'));
});
test('win and loss use the existing shared pretend vault',async()=>{
 const g=await game({[vault]:'800'},[0,1]);assert.equal(g.run('state.balance'),800);
 await g.run("$('#flip').onclick()");assert.equal(g.data.get(vault),'825');
 await g.run("$('#flip').onclick()");assert.equal(g.data.get(vault),'800');
 assert.equal(JSON.parse(g.data.get(journal)).history.length,2);
});
test('best of three debits only one stake and stops when a side wins twice',async()=>{
 const g=await game({[vault]:'1000'},[0,1,0]);g.run("mode='best3'");await g.run("$('#flip').onclick()");
 assert.equal(g.data.get(vault),'1025');const state=JSON.parse(g.data.get(journal));assert.equal(state.history[0].flips.length,3);assert.equal(state.history[0].mode,'best3');
});
test('unfinished rounds recover exactly once against the current shared balance',async()=>{
 const pending={id:'pending-round',result:'original',picked:'original',amount:25,before:1000,mode:'single',flips:['original']};
 const g=await game({[vault]:'950',[journal]:JSON.stringify({balance:975,history:[],pending})});assert.equal(g.data.get(vault),'1000');
 await g.run('withLedger(async()=>{})');assert.equal(g.data.get(vault),'1000');assert.equal(JSON.parse(g.data.get(journal)).history.length,1);
});
test('invalid amounts cannot debit pretend credits',async()=>{
 const g=await game({[vault]:'10'});g.query('#wager').value='11';await g.run("$('#flip').onclick()");assert.equal(g.data.get(vault),'10');g.query('#wager').value='-5';await g.run("$('#flip').onclick()");assert.equal(g.data.get(vault),'10');
});
