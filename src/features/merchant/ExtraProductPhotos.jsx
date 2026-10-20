import {useEffect,useState} from 'react';
import ProductPhoto from './ProductPhoto';
import {GALLERY_SLOTS} from '../../../shared/market-product-media.mjs';
function Slot({slot,file,saved,removed,onFile,onRemove,onPreparing,disabled}){
 const [preview,setPreview]=useState('');useEffect(()=>{if(!file){setPreview('');return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
 return <div className="ml-extra-photo"><ProductPhoto label={'Extra photo '+slot} file={file} onSelect={onFile} onPreparing={onPreparing} disabled={disabled} help="Optional detail, alternate angle, or finished example."/>{(preview||saved&&!removed)&&<img className="ml-photo-preview" src={preview||saved} alt={'Extra photo '+slot+' preview'}/>}<button type="button" disabled={disabled||(!file&&!saved)} onClick={onRemove}>{removed?'Restore saved photo':'Remove this photo'}</button></div>;
}
export default function ExtraProductPhotos({draft,files,removed,onFile,onRemove,onPreparing,disabled}){
 return <details className="ml-extra-photos"><summary>Additional product photos · up to 4</summary><p>Show alternate angles, materials and close-up details. Pictures upload when you save the product.</p><div className="ml-extra-grid">{GALLERY_SLOTS.map(slot=><Slot key={slot} slot={slot} file={files[slot]} saved={draft.gallery_photos?.find(p=>p.slot===slot)?.url} removed={removed.includes(slot)} onFile={file=>onFile(slot,file)} onRemove={()=>onRemove(slot)} onPreparing={busy=>onPreparing(slot,busy)} disabled={disabled}/>)}</div></details>;
}
