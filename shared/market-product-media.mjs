export const GALLERY_SLOTS=[1,2,3,4];
export const DELIVERY_METHODS=['Arrange with merchant','Shipping available','Local pickup','Local pickup or shipping','Digital delivery'];
export function deliveryFields(text=''){
 const lines=String(text).split('\n'),method=DELIVERY_METHODS.includes(lines[0])?lines.shift():'Arrange with merchant';
 const turn=lines.findIndex(line=>line.startsWith('Turnaround: '));const turnaround=turn<0?'':lines.splice(turn,1)[0].slice(12);
 return {method,turnaround,notes:lines.join('\n')};
}
export function deliveryText({method,turnaround='',notes=''}){return [method,turnaround.trim()?'Turnaround: '+turnaround.trim():'',notes.trim()].filter(Boolean).join('\n');}
export function coverGeometry(width,height,x=50,y=50,zoom=1){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('Invalid picture size.');
 const scale=Math.max(1600/width,600/height)*Math.max(1,Math.min(2.5,zoom));
 const cropWidth=1600/scale,cropHeight=600/scale,clamp=n=>Math.max(0,Math.min(100,n))/100;
 return {sx:(width-cropWidth)*clamp(x),sy:(height-cropHeight)*clamp(y),sw:cropWidth,sh:cropHeight};
}
export function galleryFileName(productId,slot){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)||!GALLERY_SLOTS.includes(slot))throw Error('Invalid gallery picture.');return 'gallery-'+productId+'-'+slot+'.jpg';}
