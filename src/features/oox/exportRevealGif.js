import { drawPaperBurn, REVEAL_DURATION } from './paperBurn.js';
import { encodeGif, makePalette, indexPixels } from './gifEncoder.js';
export function shareUrl(name){return `https://twitter.com/intent/tweet?${new URLSearchParams({text:`Just welcomed ${name} to my pack! You Earn, We Burn. 🔥🐾`,url:'https://thepittzstop.com/'})}`;}
export async function exportRevealGif(imageUrl,name,signal,onProgress=()=>{}){
  const image=await new Promise((resolve,reject)=>{
    const img=new Image();img.crossOrigin='anonymous';
    const clean=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);img.onload=null;img.onerror=null;};
    const fail=()=>{clean();reject(new Error('Artwork could not be loaded for GIF export. Please try again.'));};
    const abort=()=>{clean();img.src='';reject(new DOMException('Cancelled','AbortError'));};
    const timer=setTimeout(fail,15000);
    img.onload=()=>{clean();resolve(img);};img.onerror=fail;signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();return;}img.src=imageUrl;
  });
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=352;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const cover=document.createElement('canvas');cover.width=224;cover.height=224;const cc=cover.getContext('2d');
  const draw=ms=>{
    ctx.fillStyle='#080d18';ctx.fillRect(0,0,256,352);
    ctx.textAlign='center';ctx.fillStyle='#ffe1a0';ctx.font='bold 12px sans-serif';ctx.fillText('YOU EARN, WE BURN',128,24);
    const gradient=ctx.createLinearGradient(12,40,240,276);gradient.addColorStop(0,'#ffe17e');gradient.addColorStop(.33,'#ff50d6');gradient.addColorStop(.67,'#37e8db');gradient.addColorStop(1,'#ffe17e');ctx.fillStyle=gradient;ctx.fillRect(12,40,232,232);
    ctx.drawImage(image,16,44,224,224);
    if(ms<REVEAL_DURATION){drawPaperBurn(cc,224,224,Math.max(0,(ms-400)/4800),ms);ctx.drawImage(cover,16,44);if(ms<650){ctx.fillStyle='#ffd391';ctx.font='bold 20px sans-serif';ctx.fillText('YOU EARN,',128,135);ctx.fillText('WE BURN',128,161);}}
    else{ctx.strokeStyle=`rgba(255,222,151,${.35+.25*Math.sin((ms-5200)/500)})`;ctx.lineWidth=3;ctx.strokeRect(10,38,236,236);}
    for(let i=0;i<76;i++){const age=ms-(i%14)*150;if(age<0||age>2400)continue;const t=age/2400;ctx.globalAlpha=Math.sin(t*Math.PI);ctx.fillStyle='#ffd79b';ctx.fillRect(90+((i*83)%500-250)*t,196+(-80-(i*47)%330)*t,1+i%2,2+i%3);}ctx.globalAlpha=1;
    ctx.fillStyle='#fff';ctx.font='bold 14px sans-serif';ctx.fillText(name.slice(0,48),128,296,235);ctx.fillStyle='#8bf2da';ctx.font='11px sans-serif';ctx.fillText(ms>=5200?'WELCOME TO YOUR PACK':'Welcoming a new pack member…',128,316);ctx.fillStyle='#b8c3d6';ctx.fillText('thepittzstop.com',128,337);
  };
  draw(6000);const palette=makePalette(ctx.getImageData(0,0,256,352).data),cache=new Map(),frames=[];
  for(let i=0;i<68;i++){
    if(signal.aborted)throw new DOMException('Cancelled','AbortError');
    draw(i*100);frames.push(indexPixels(ctx.getImageData(0,0,256,352).data,palette,cache));onProgress(Math.round((i+1)/68*100));
    if(i%3===0)await new Promise(resolve=>setTimeout(resolve,0));
  }
  if(signal.aborted)throw new DOMException('Cancelled','AbortError');
  return new Blob([encodeGif(frames,256,352,palette,100)],{type:'image/gif'});
}
