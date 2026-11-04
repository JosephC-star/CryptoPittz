// The outer Playground owns scrolling. Resize the frame when details/results grow.
(() => {
 const details=document.querySelector('#game-details');
 document.querySelector('.details-jump').addEventListener('click',event=>{
  event.preventDefault();details.open=!details.open;
  if(details.open&&window.parent===window)details.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
 });
 if(window.parent===window)return;
 document.body.classList.add('embedded');
 document.querySelector('#playground-settings').addEventListener('click',()=>window.parent.postMessage({type:'pittz-flip-settings'},window.location.origin));
 let last=0;
 const report=()=>{
  const height=Math.ceil(document.querySelector('main').getBoundingClientRect().height+12);
  if(height===last)return;last=height;
  window.parent.postMessage({type:'pittz-flip-height',height},window.location.origin);
 };
 new ResizeObserver(report).observe(document.querySelector('main'));
 window.addEventListener('load',report);report();
})();
