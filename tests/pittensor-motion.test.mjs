import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../src/features/bonez-burn/rigMotion.js',import.meta.url),'utf8');
const {shovelPose,shaftPoint,armJoint}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
test('shovel loop closes smoothly without a reset jump',()=>{
 const a=shovelPose(0),b=shovelPose(1-1e-6);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.001);assert.ok(Math.abs(a.angle-b.angle)<.001);
 for(let i=1;i<10000;i++){const p=shovelPose(i/10000),q=shovelPose((i-1)/10000);assert.ok(Math.hypot(p.x-q.x,p.y-q.y)<.2);}
});
test('both paws remain within arm reach across the entire stroke',()=>{
 for(let i=0;i<=1000;i++)for(const [s,d,bend] of [[{x:287,y:205},-5,-1],[{x:130,y:166},-95,1]]){
  const h=shaftPoint(shovelPose(i/1000),d),j=armJoint(s,h,105,135,bend);assert.ok(Math.abs(Math.hypot(j.x-s.x,j.y-s.y)-105)<1e-7);assert.ok(Math.abs(Math.hypot(j.x-h.x,j.y-h.y)-135)<1e-7);
 }
});
