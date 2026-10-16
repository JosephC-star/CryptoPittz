import { useRef, useState } from 'react';
import './product-photo.css';


async function preparePhoto(photo) {
  if(photo.size<=2097152)return photo;
  const url=URL.createObjectURL(photo);
  try{
    const image=await new Promise((resolve,reject)=>{
      const picture=new Image();picture.onload=()=>resolve(picture);
      picture.onerror=()=>reject(Error('This picture could not be read. Try exporting a JPG copy.'));
      picture.src=url;
    });
    let edge=2000;
    for(const quality of [.88,.76,.62,.5]){
      const ratio=Math.min(1,edge/Math.max(image.naturalWidth,image.naturalHeight));
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));
      canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
      const context=canvas.getContext('2d');
      if(!context)throw Error('Your browser could not prepare this picture. Try a smaller JPG.');
      context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
      context.drawImage(image,0,0,canvas.width,canvas.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
      canvas.width=canvas.height=1;
      if(blob&&blob.size<=2097152)return new File([blob],photo.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg'});
      edge=1500;
    }
    throw Error('This picture is still too large. Try a smaller JPG.');
  }finally{URL.revokeObjectURL(url);}
}

export default function ProductPhoto({file,onSelect,onPreparing,disabled,label="Product photo",help="Large pictures are resized automatically. Your picture uploads when you save the product."}) {
  const input=useRef(null);
  const [dragging,setDragging]=useState(false),[error,setError]=useState(''),[preparing,setPreparing]=useState(false);
  async function choose(files){
    setDragging(false);
    if(disabled||preparing||!files?.length)return;
    if(files.length!==1){setError('Please add one product photo at a time.');return;}
    const photo=files[0];
    if(!['image/jpeg','image/png','image/webp'].includes(photo.type)){
      setError('This photo format is not supported. Export it as JPG, PNG or WebP, then try again.');return;
    }
    if(!photo.size||photo.size>20971520){setError('Choose a photo up to 20 MB.');return;}
    setError('');setPreparing(true);onPreparing(true);
    try{onSelect(await preparePhoto(photo));}catch(error){setError(error.message||'This picture could not be read. Try exporting a JPG copy.');}finally{setPreparing(false);onPreparing(false);}
  }
  return <section className={'ml-photo-drop'+(dragging?' is-dragging':'')} aria-label={label}
    onDragEnter={e=>{e.preventDefault();if(!disabled&&!preparing)setDragging(true);}}
    onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect=disabled||preparing?'none':'copy';}}
    onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragging(false);}}
    onDrop={e=>{e.preventDefault();choose(e.dataTransfer.files);}}>
    <b>{label}</b><p>Drag a picture here, or browse your photos.</p>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled||preparing}
      aria-label={"Choose "+label.toLowerCase()} onChange={e=>{choose(e.target.files);e.target.value='';}}/>
    <button type="button" disabled={disabled||preparing} onClick={()=>input.current?.click()}>Browse photos</button>
    <p className="ml-photo-help">JPG, PNG or WebP · Up to 20 MB<br/>{help}</p>
    {preparing&&<p role="status">Preparing your picture…</p>}
    {file&&<p role="status">Selected: {file.name}</p>}
    {error&&<p className="ml-photo-error" role="alert">{error}</p>}
  </section>;
}

