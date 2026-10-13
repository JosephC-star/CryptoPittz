import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
test('compiled game bundle changes are confined to five Pinball drawing statements',async()=>{
 let source=await readFile(new URL('../public/playground/playground.js',import.meta.url),'utf8');
 source=source.replace('import {drawPinballPlate,pinballChrome,pinballOrb,pinballGlint} from "./game-materials.js";\n','');
 const pairs=[
 ['o.fillStyle=p,o.fillRect(0,0,420,700);','o.fillStyle=p,o.fillRect(0,0,420,700),drawPinballPlate(o);'],
 ['o.strokeStyle=t.targets[n]?`#a0ffb9`:`#697baf`','o.strokeStyle=t.targets[n]?`#a0ffb9`:pinballChrome(o,e.x,e.y,20)'],
 ['o.lineWidth=3,o.stroke()}),o.shadowBlur=0,t.popups','o.lineWidth=5,o.stroke(),pinballGlint(o,e.x,e.y,20)}),o.shadowBlur=0,t.popups'],
 ['o.lineWidth=14,o.strokeStyle=e.color,o.shadowColor=e.color,o.shadowBlur=14,o.stroke()','o.lineWidth=14,o.strokeStyle=pinballChrome(o,e.x,e.y,18),o.shadowColor=e.color,o.shadowBlur=10,o.stroke(),o.lineWidth=4,o.strokeStyle=e.color,o.shadowBlur=0,o.stroke()'],
 ['o.arc(n.x,n.y,n.r+3,0,Math.PI*2),o.fillStyle=`#ffffff`,o.strokeStyle=`#030713`','o.arc(n.x,n.y,n.r+3,0,Math.PI*2),o.fillStyle=pinballOrb(o,n.x,n.y,n.r+3),o.strokeStyle=`#b8eff5`']];
 for(const [original,updated] of pairs){assert.equal(source.split(updated).length-1,1);source=source.replace(updated,original);}
 assert.equal(createHash('sha256').update(source).digest('hex'),'748727f238c0a5fec15a2fe51d9e6df0cb51d8ef4c3f12469586e8a9a64dbb74');
});
