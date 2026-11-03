// Accept sizing only from our own mounted Bonez Flip frame.
(() => {
 let mounted=null;
 function sync(){
  const frame=document.querySelector('.bonez-flip-frame');
  document.body.classList.toggle('compact-flip-active',!!frame);
  if(frame&&frame!==mounted){
   mounted=frame;frame.setAttribute('scrolling','no');
   requestAnimationFrame(()=>frame.closest('.arcade-stage')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}));
  }else if(!frame)mounted=null;
 }
 window.addEventListener('message',event=>{
  const frame=document.querySelector('.bonez-flip-frame');
  if(event.origin!==window.location.origin||!frame||event.source!==frame.contentWindow)return;
  if(event.data?.type==='pittz-flip-settings'){document.body.classList.add('flip-settings-open');document.querySelector('#flip-host-tools').hidden=false;document.querySelector('.vibe-mode')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(event.data?.type!=='pittz-flip-height'||!Number.isFinite(event.data.height)||event.data.height<300||event.data.height>10000)return;
  frame.style.height=Math.ceil(event.data.height)+'px';
 });
 document.querySelector('#flip-return-to-coin').addEventListener('click',()=>{document.body.classList.remove('flip-settings-open');document.querySelector('#flip-host-tools').hidden=true;document.querySelector('.flip-stage')?.scrollIntoView({behavior:'smooth',block:'start'});});
 new MutationObserver(sync).observe(document.querySelector('#root'),{childList:true,subtree:true});sync();
})();
