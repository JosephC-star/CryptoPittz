import { useRef, useState } from 'react';
import './product-photo.css';

export default function ProductPhoto({file,onSelect,disabled}) {
  const input=useRef(null);
  const [dragging,setDragging]=useState(false),[error,setError]=useState('');
  function choose(files){
    setDragging(false);
    if(disabled||!files?.length)return;
    if(files.length!==1){setError('Please add one product photo at a time.');return;}
    const photo=files[0];
    if(!['image/jpeg','image/png','image/webp'].includes(photo.type)){
      setError('This photo format is not supported. Export it as JPG, PNG or WebP, then try again.');return;
    }
    if(!photo.size||photo.size>2097152){setError('Choose a photo under 2 MB. Resize the picture or export a smaller copy first.');return;}
    setError('');onSelect(photo);
  }
  return <section className={'ml-photo-drop'+(dragging?' is-dragging':'')} aria-label="Product photo"
    onDragEnter={e=>{e.preventDefault();if(!disabled)setDragging(true);}}
    onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect=disabled?'none':'copy';}}
    onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragging(false);}}
    onDrop={e=>{e.preventDefault();choose(e.dataTransfer.files);}}>
    <b>Product photo</b><p>Drag a picture here, or browse your photos.</p>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled}
      aria-label="Choose product photo" onChange={e=>{choose(e.target.files);e.target.value='';}}/>
    <button type="button" disabled={disabled} onClick={()=>input.current?.click()}>Browse photos</button>
    <p className="ml-photo-help">JPG, PNG or WebP · Maximum 2 MB<br/>Your picture uploads when you save the product.</p>
    {file&&<p role="status">Selected: {file.name}</p>}
    {error&&<p className="ml-photo-error" role="alert">{error}</p>}
  </section>;
}
