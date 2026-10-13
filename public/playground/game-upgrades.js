const ns='http://www.w3.org/2000/svg';
function materials(){
 const craft=document.querySelector('.crash-craft svg');
 if(craft&&!craft.dataset.yardMaterial){
  const defs=craft.querySelector('defs');if(defs){craft.dataset.yardMaterial='true';const g=document.createElementNS(ns,'linearGradient');g.id='ny-craft-metal';g.setAttribute('x2','.3');g.setAttribute('y2','1');[[0,'#fff0b7'],[.2,'#a39abd'],[.4,'#2d354d'],[.58,'#6da6b4'],[.75,'#252c48'],[1,'#d1ac70']].forEach(([offset,color])=>{const s=document.createElementNS(ns,'stop');s.setAttribute('offset',offset);s.setAttribute('stop-color',color);g.append(s);});defs.append(g);}
 }
 const beat=document.querySelector('svg.beat-highway');
 if(beat&&!beat.dataset.yardMaterial){
  const defs=beat.querySelector('defs');if(defs){beat.dataset.yardMaterial='true';const p=document.createElementNS(ns,'pattern');p.id='ny-beat-deck';p.setAttribute('patternUnits','userSpaceOnUse');p.setAttribute('width','400');p.setAttribute('height','440');const im=document.createElementNS(ns,'image');im.setAttribute('href','/images/playground/beat-rooftop.webp');im.setAttribute('width','400');im.setAttribute('height','440');im.setAttribute('preserveAspectRatio','xMidYMid slice');p.append(im);defs.append(p);}
 }
}
new MutationObserver(materials).observe(document.querySelector('#root'),{childList:true,subtree:true});materials();
