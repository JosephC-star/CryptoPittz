let pinballPlate;
export function drawPinballPlate(context){
 if(!pinballPlate){pinballPlate=new Image();pinballPlate.src='/images/playground/pinball-backplate.webp';}
 if(pinballPlate.complete&&pinballPlate.naturalWidth)context.drawImage(pinballPlate,0,0,420,700);
}
export function pinballChrome(context,x,y,r){
 const gradient=context.createLinearGradient(x-r,y-r,x+r,y+r);
 [[0,'#fff1c5'],[.18,'#a2e5ed'],[.42,'#34455e'],[.65,'#e5d7f7'],[1,'#786a92']].forEach(([at,color])=>gradient.addColorStop(at,color));return gradient;
}
export function pinballOrb(context,x,y,r){
 const gradient=context.createRadialGradient(x-r*.3,y-r*.3,0,x,y,r);
 [[0,'#ffffff'],[.25,'#d1fbff'],[.55,'#7e9bb6'],[.82,'#43506d'],[1,'#142135']].forEach(([at,color])=>gradient.addColorStop(at,color));return gradient;
}
export function pinballGlint(context,x,y,r){context.save();context.shadowBlur=0;context.strokeStyle='#eefcff';context.lineWidth=1.2;context.globalAlpha=.7;context.beginPath();context.arc(x,y,r-.5,Math.PI*1.12,Math.PI*1.65);context.stroke();context.restore();}
