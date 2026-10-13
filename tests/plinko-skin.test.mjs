import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../public/playground/plinko-skin.js',import.meta.url),'utf8');
test('material enhancement retains existing definitions and applies once per board',()=>{
 const original={id:'plinko-ball'},defs={children:[original],append(...nodes){this.children.push(...nodes);}},board={dataset:{},querySelector:()=>defs};let onMutation;
 const context={document:{querySelector:selector=>selector==='svg.plinko-board'?board:{},createElementNS:(_,type)=>({type,attributes:{},children:[],setAttribute(key,value){this.attributes[key]=value;},append(node){this.children.push(node);}})},MutationObserver:class{constructor(callback){onMutation=callback;}observe(){}}};
 vm.runInNewContext(source,context);assert.equal(defs.children[0],original);assert.equal(defs.children.length,5);assert.equal(new Set(defs.children.slice(1).map(n=>n.id)).size,4);onMutation();onMutation();assert.equal(defs.children.length,5);
});
