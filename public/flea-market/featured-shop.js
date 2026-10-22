import {plainCopy} from './merchant-copy.mjs';
const card=document.getElementById('featured-shop');
if(card){
 try{
  const response=await fetch('/.netlify/functions/market-api?route=featured',{cache:'no-store'});
  if(!response.ok)throw Error('Spotlight unavailable');
  const {shop}=await response.json();
  if(shop&&Number.isSafeInteger(shop.booth_number)&&shop.booth_number>0){
   const href='/market-shop?booth='+shop.booth_number,banner=card.querySelector('.featured-banner');
   const imageLink=document.createElement('a');imageLink.href=href;imageLink.setAttribute('aria-label','Visit '+shop.name);
   if(shop.cover_url){const img=document.createElement('img');img.src=shop.cover_url;img.alt=shop.name+' shop banner';img.width=1600;img.height=600;img.addEventListener('error',()=>imageLink.remove(),{once:true});imageLink.append(img);}
   else{imageLink.textContent=shop.name;imageLink.className='featured-banner-name';}
   banner.append(imageLink);
   card.querySelector('.status').textContent='FEATURED MAKER · BOOTH '+shop.booth_number+' · ROTATES DAILY';
   card.querySelector('h3').textContent=shop.name;
   const copy=plainCopy(shop.description);card.querySelector('.boothinfo p').textContent=copy.length>240?copy.slice(0,237).replace(/\s+\S*$/,'')+'…':copy||'Step inside and discover what this community maker is creating.';
   const link=card.querySelector('.btn');link.href=href;link.textContent='Visit '+shop.name+' ↗';
  }
 }catch{ /* Keep a useful directory link when the spotlight cannot load. */ }
}
