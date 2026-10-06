export const REVEAL_DURATION = 5200;
export function drawPaperBurn(ctx, w, h, progress, elapsed) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#090807'; ctx.fillRect(0, 0, w, h);
  for (let i=0;i<320;i++) { ctx.fillStyle=i%3?'#ffffff05':'#5f3f2010'; ctx.fillRect((i*73)%w,(i*137)%h,1,1); }
  const radius=3+Math.pow(progress,1.1)*w*1.6;
  ctx.beginPath();
  for(let i=0;i<=120;i++) {
    const a=i/120*Math.PI*2;
    const ragged=.88+.16*Math.sin(a*3+.8)+.1*Math.sin(a*7+2)+.055*Math.sin(a*19)+.02*Math.sin(a*37+elapsed*.005);
    const r=radius*ragged,x=w*.32+Math.cos(a)*r,y=h*.68+Math.sin(a)*r*.8;
    if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
  }
  ctx.closePath();ctx.strokeStyle='#311b0e';ctx.lineWidth=13;ctx.stroke();ctx.strokeStyle='#7e3110';ctx.lineWidth=6;ctx.stroke();
  ctx.save();ctx.globalCompositeOperation='destination-out';ctx.fillStyle='#000';ctx.globalAlpha=1;ctx.fill();ctx.restore();
  ctx.save();ctx.strokeStyle='#f77b20';ctx.lineWidth=2.1;ctx.shadowColor='#ff5910';ctx.shadowBlur=8+3*Math.sin(elapsed*.021);ctx.stroke();ctx.strokeStyle='#ffdc8f';ctx.lineWidth=.7;ctx.shadowBlur=2;ctx.stroke();ctx.restore();
}
