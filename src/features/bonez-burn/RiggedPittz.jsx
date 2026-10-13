import {useEffect,useRef} from 'react';
import {armJoint,shovelPose,shaftPoint,smooth} from './rigMotion';
const bone = new Path2D('M-11 -3C-14 -10 -21 -8 -20 -3L-17 0L-20 3C-21 8 -14 10 -11 3L11 3C14 10 21 8 20 3L17 0L20 -3C21 -8 14 -10 11 -3Z');
export default function RiggedPittz({firing}) {
 const ref=useRef(null), speed=useRef(firing); speed.current=firing;
 useEffect(()=>{
  const canvas=ref.current,c=canvas.getContext('2d');if(!c)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let frame=0,disposed=false,clock=0,last=0;
  const assets={};
  const load=Promise.all(['left','right'].flatMap(s=>['body','upper','fore'].map(n=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{assets[`${s}-${n}`]=im;resolve();};im.onerror=reject;im.src=`/images/bonez-burn/rig-${s}-${n}.webp`;}))));
  function limb(im,a,b,thickness,hand=false){c.save();c.translate(a.x,a.y);c.rotate(Math.atan2(b.y-a.y,b.x-a.x));const len=Math.hypot(b.x-a.x,b.y-a.y);c.drawImage(im,-12,-thickness/2,len+(hand?35:24),thickness);c.restore();}
  function arm(side,s,h,front){const j=armJoint(s,h,105,135,front?1:-1);limb(assets[side+'-upper'],s,j,64);limb(assets[side+'-fore'],j,h,49,true);}
  function drawBone(x,y,angle,scale=1){c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);c.fillStyle='#ffe3a6';c.strokeStyle='#795124';c.lineWidth=2;c.fill(bone);c.stroke(bone);c.restore();}
  function worker(side,phase,w,h){
   c.save();const unit=Math.min(w*.00105,h*.00165); // local 500-unit rigs, planted at the floor
   c.translate(side==='left'?w*.025:w*.975,h*.98);c.scale(side==='left'?unit:-unit,unit);c.translate(0,-475);
   const p=shovelPose(phase),back=shaftPoint(p,-5),front=shaftPoint(p,-95);
   arm(side,{x:287,y:205},back,false);
   if(side==='right'){c.save();c.translate(350,0);c.scale(-1,1);c.drawImage(assets[side+'-body'],0,0,350,467);c.restore();}else c.drawImage(assets[side+'-body'],0,0,350,467);
   // A continuous wooden shaft and brass blade; neither is masked at the furnace opening.
   c.save();c.translate(p.x,p.y);c.rotate(p.angle);
   const gold=c.createLinearGradient(100,-25,170,30);gold.addColorStop(0,'#fff4b4');gold.addColorStop(.3,'#eeb945');gold.addColorStop(.6,'#9e5a18');gold.addColorStop(1,'#ffdc71');
   c.lineCap='round';c.strokeStyle='#3e230e';c.lineWidth=15;c.beginPath();c.moveTo(-130,0);c.lineTo(115,0);c.stroke();c.strokeStyle='#bc8439';c.lineWidth=9;c.stroke();c.strokeStyle='#f7d38a';c.lineWidth=2;c.beginPath();c.moveTo(-130,-3);c.lineTo(112,-3);c.stroke();
   c.fillStyle=gold;c.strokeStyle='#6e4017';c.lineWidth=3;c.beginPath();c.moveTo(103,-16);c.quadraticCurveTo(143,-37,173,-21);c.lineTo(180,24);c.quadraticCurveTo(130,31,103,15);c.closePath();c.fill();c.stroke();c.strokeStyle='#ffe7a2';c.lineWidth=2;c.beginPath();c.moveTo(109,-14);c.quadraticCurveTo(145,-29,167,-19);c.stroke();
   const loadOpacity=phase<.18?smooth(phase/.18):phase<.55?1:phase<.66?1-smooth((phase-.55)/.11):0;
   c.globalAlpha=loadOpacity;for(let i=0;i<8;i++)drawBone(125+(i%3)*14,-12-Math.floor(i/3)*7,i*1.8,.55);c.restore();
   arm(side,{x:130,y:166},front,true);
   // Each released bone follows the actual blade tip, then falls inward into the fire.
   for(let i=0;i<7;i++){const start=.55+i*.013,t=(phase-start)/.19;if(t>=0&&t<=1){const release=shaftPoint(shovelPose(start),165),target={x:side==='left'?(w*.5-w*.025)/unit:(w*.975-w*.5)/unit,y:475-(h*.22)/unit};c.globalAlpha=1-smooth(Math.max(0,(t-.8)/.2));drawBone(release.x+(target.x-release.x)*t,release.y+(target.y-release.y)*t-42*Math.sin(Math.PI*t),i*1.7+t*5,.65);c.globalAlpha=1;}}
   c.restore();
  }
  function tick(now){if(disposed)return;const box=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5);if(canvas.width!==Math.round(box.width*dpr)||canvas.height!==Math.round(box.height*dpr)){canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);}c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,box.width,box.height);if(last&&!document.hidden&&!reduced.matches)clock+=Math.min(now-last,50)/(speed.current?3600:6800);last=now;worker('left',reduced.matches?.4:clock%1,box.width,box.height);worker('right',reduced.matches?.4:(clock+.5)%1,box.width,box.height);frame=requestAnimationFrame(tick);}
  load.then(()=>{if(!disposed)frame=requestAnimationFrame(tick);}).catch(()=>{canvas.dataset.loadError='true';});
  return()=>{disposed=true;cancelAnimationFrame(frame);};
 },[]);
 return <canvas className="pittz-rig-canvas" ref={ref} aria-hidden="true"/>;
}
