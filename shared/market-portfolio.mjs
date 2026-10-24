export const PORTFOLIO_LIMIT=6;
export function portfolioInput(body,shopId){
 const slot=Number(body.slot),title=typeof body.title==='string'?body.title.trim():'',caption=typeof body.caption==='string'?body.caption.trim():'';
 const image_path=body.image_path;
 if(!Number.isInteger(slot)||slot<1||slot>PORTFOLIO_LIMIT||!title||title.length>120||caption.length>1500||!['draft','published'].includes(body.status))throw Object.assign(Error('Add a title, a photo and a valid gallery slot. Titles can be up to 120 characters and captions up to 1,500.'),{status:400});
 if(typeof image_path!=='string'||!new RegExp('^'+shopId+'/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.(jpg|png|webp)$','i').test(image_path))throw Object.assign(Error('Choose a photo uploaded to your own shop.'),{status:400});
 return {slot,title,caption,image_path,status:body.status};
}
