// GIF89a with a bounded palette and literal LZW blocks. No external encoder or upload.
export function encodeGif(frames, width, height, palette, delay=100) {
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>512||height>512||frames.length<1||frames.length>100||palette.length!==256)throw new Error('Invalid GIF dimensions or palette');
  const bytes=new Uint8Array(frames.length*(width*height*2+1024)+1024);let offset=0; const byte=n=>{bytes[offset++]=n&255;},word=n=>{byte(n);byte(n>>8);},text=s=>{for(const c of s)byte(c.charCodeAt(0));};
  text('GIF89a');word(width);word(height);byte(0xf7);byte(0);byte(0);
  for(const rgb of palette)for(const n of rgb)byte(n);
  byte(0x21);byte(0xff);byte(11);text('NETSCAPE2.0');byte(3);byte(1);word(0);byte(0);
  for(const frame of frames){
    if(frame.length!==width*height)throw new Error('Invalid GIF frame');
    byte(0x21);byte(0xf9);byte(4);byte(4);word(Math.round(delay/10));byte(0);byte(0);
    byte(0x2c);word(0);word(0);word(width);word(height);byte(0);byte(8);
    const data=[];let bits=0,count=0;
    const code=n=>{bits|=n<<count;count+=9;while(count>=8){data.push(bits&255);bits>>>=8;count-=8;}};
    // Reset before dictionary growth can increase the code width above nine bits.
    for(let i=0;i<frame.length;i++){if(i%240===0)code(256);code(frame[i]);}
    code(257);if(count)data.push(bits&255);
    for(let i=0;i<data.length;i+=255){const size=Math.min(255,data.length-i);byte(size);for(let j=0;j<size;j++)byte(data[i+j]);}byte(0);
  }
  byte(0x3b);return bytes.slice(0,offset);
}
export function makePalette(rgba){
  const histogram=new Map();
  for(let i=0;i<rgba.length;i+=4){const key=(rgba[i]>>3)<<10|(rgba[i+1]>>3)<<5|rgba[i+2]>>3;histogram.set(key,(histogram.get(key)||0)+1);}
  const colors=[...histogram].sort((a,b)=>b[1]-a[1]).slice(0,224).map(([k])=>[((k>>10)&31)*8+4,((k>>5)&31)*8+4,(k&31)*8+4]);
  for(let i=0;i<32;i++)colors.push([Math.round(i*255/31),Math.round(i*210/31),Math.round(i*140/31)]);
  while(colors.length<256)colors.push([0,0,0]);return colors;
}
export function indexPixels(rgba,palette,cache=new Map()){
  const out=new Uint8Array(rgba.length/4);
  for(let i=0,j=0;i<rgba.length;i+=4,j++){
    const key=(rgba[i]>>3)<<10|(rgba[i+1]>>3)<<5|rgba[i+2]>>3;
    let found=cache.get(key);
    if(found===undefined){let best=Infinity;found=0;for(let k=0;k<palette.length;k++){const c=palette[k],d=(rgba[i]-c[0])**2+(rgba[i+1]-c[1])**2+(rgba[i+2]-c[2])**2;if(d<best){best=d;found=k;}}cache.set(key,found);}
    out[j]=found;
  }return out;
}
