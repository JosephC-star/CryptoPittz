import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../public/playground/neon-yard.js',import.meta.url),'utf8');
function setup(){
 const events={},classes=new Set(),buttons=['All games','Quick play','Table games','Rhythm'].map(category=>({dataset:{category},setAttribute(key,value){this[key]=value;}}));
 const cards=Array.from({length:9},()=>({dataset:{},style:{setProperty(){}},hidden:false}));let filters=false;
 const lobby={querySelectorAll:()=>cards,before(){filters=true;}};
 const document={body:{classList:{toggle(key,on){on?classes.add(key):classes.delete(key);}}},querySelector(selector){if(selector==='.arcade-lobby')return lobby;if(selector==='.ny-filters')return filters?{}:null;if(selector==='#ny-filter-template')return{content:{cloneNode:()=>({})}};return{};},querySelectorAll:()=>buttons,addEventListener(name,fn){events[name]=fn;}};
 const location={hash:'#/playground'};const context={document,location,window:{addEventListener(name,fn){events[name]=fn;}},MutationObserver:class{observe(){}},matchMedia:()=>({matches:true})};vm.runInNewContext(source,context);
 return{cards,buttons,classes,location,events,filter(category){events.click({target:{closest(selector){return selector==='[data-category]'?buttons.find(b=>b.dataset.category===category):null;}}});}};
}
test('cabinet filters keep all nine routes and expose the selected category',()=>{
 const s=setup();assert.equal(s.cards.filter(c=>!c.hidden).length,9);s.filter('Table games');assert.equal(s.cards.filter(c=>!c.hidden).length,3);assert.equal(s.buttons[2]['aria-pressed'],'true');s.filter('Rhythm');assert.equal(s.cards.filter(c=>!c.hidden)[0].dataset.yardGame,'beat');s.filter('All games');assert.equal(s.cards.filter(c=>!c.hidden).length,9);
});
test('every game hides the hero, and returning to the lobby resets filters',()=>{
 const s=setup();for(const game of ['rush','palace','match','twentyone','roulette','plinko','pinball','crash','beat']){s.location.hash=`#/playground/${game}`;s.events.hashchange();assert.equal(s.classes.has('ny-in-game'),true);}
 s.filter('Rhythm');s.location.hash='#/playground';s.events.hashchange();assert.equal(s.classes.has('ny-in-game'),false);assert.equal(s.cards.filter(c=>!c.hidden).length,9);
});
