import test from 'node:test';
import assert from 'node:assert/strict';
import {rarestTraits} from '../src/utils/traitRarity.mjs';
const encoded=btoa('Fur:Diamond;Eye:Goggles;Head:Spikes;Fur:Diamond;tags:Rank-1;metadata:ipfs');
test('ranks visual traits by frequency with collection-specific denominators',()=>{
 const result=rarestTraits(encoded,{total:1000,traits:{Fur:{Diamond:30},Eye:{Goggles:10},Head:{Spikes:20}}});
 assert.deepEqual(result.map(t=>[t.trait,t.count,t.percentage]),[['Eye',10,1],['Head',20,2],['Fur',30,3]]);
 assert.equal(rarestTraits(encoded,{total:100,traits:{Fur:{Diamond:5}}})[0].percentage,5);
});
test('unknown or invalid metadata never invents rarity',()=>{
 assert.deepEqual(rarestTraits(encoded,undefined),[]);
 assert.deepEqual(rarestTraits('???',{total:100,traits:{}}),[]);
 assert.deepEqual(rarestTraits(encoded,{total:100,traits:{}}),[]);
});
