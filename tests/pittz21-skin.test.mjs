import test from 'node:test';
import assert from 'node:assert/strict';
import {tableMood} from '../public/playground/pittz21-skin.js';
import {readFile} from 'node:fs/promises';
test('dealer reactions distinguish player blackjack from dealer blackjack and pushes',()=>{
 assert.equal(tableMood('NATURAL BLACKJACK!'),'blackjack');assert.equal(tableMood('DEALER BLACKJACK'),'loss');assert.equal(tableMood('DOUBLE BLACKJACK PUSH'),'push');assert.equal(tableMood('DEALER BUSTS — WOOF WOOF!'),'win');assert.equal(tableMood('DOUBLE-DOWN BUST!'),'bust');assert.equal(tableMood('YOUR MOVE'),'ready');
});
test('presentation leaves the glowing hidden-card design and game decisions intact',async()=>{
 const source=await readFile(new URL('../public/playground/pittz21-skin.js',import.meta.url),'utf8');const css=await readFile(new URL('../public/playground/pittz21-skin.css',import.meta.url),'utf8');
 assert(!/\.p21-card\.hidden\s*\{/.test(css));assert(source.includes("querySelectorAll('.p21-card.dealt')"));assert(!/localStorage\.setItem\([^)]*bonez|\.click\(|\.onclick\s*=|Math\.random/.test(source));
});
