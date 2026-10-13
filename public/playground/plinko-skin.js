// Cosmetic SVG materials only. Positions, outcomes, animation paths and payouts remain owned by the game.
const ns = 'http://www.w3.org/2000/svg';
function gradient(id,type,attributes,stops){
 const node=document.createElementNS(ns,type);node.id=id;
 Object.entries(attributes).forEach(([key,value])=>node.setAttribute(key,value));
 stops.forEach(([offset,color])=>{const stop=document.createElementNS(ns,'stop');stop.setAttribute('offset',offset);stop.setAttribute('stop-color',color);node.append(stop);});return node;
}
function skin(){
 const board=document.querySelector('svg.plinko-board');if(!board||board.dataset.yardSkinned)return;
 const defs=board.querySelector('defs');if(!defs)return;
 board.dataset.yardSkinned='true';
 defs.append(
  gradient('ny-plinko-peg','radialGradient',{cx:'.3',cy:'.22',r:'.85'},[['0','#fff7d8'],['.22','#c7f5ff'],['.5','#6a9da7'],['.76','#304653'],['1','#101d2e']]),
  gradient('ny-plinko-hot','radialGradient',{cx:'.35',cy:'.25',r:'.8'},[['0','#fffaf0'],['.4','#adffff'],['.7','#51cecf'],['1','#8160d2']]),
  gradient('ny-plinko-pocket','linearGradient',{x1:'0',y1:'0',x2:'.8',y2:'1'},[['0','#3b314b'],['.16','#71618b'],['.3','#1e263e'],['.8','#101522'],['1','#30253a']]),
  gradient('ny-plinko-orb','radialGradient',{cx:'.3',cy:'.23',r:'.9'},[['0','#fffdf1'],['.28','#d3f6f4'],['.58','#78b1c8'],['.8','#414665'],['1','#151c34']])
 );
}
new MutationObserver(skin).observe(document.querySelector('#root'),{childList:true,subtree:true});skin();
