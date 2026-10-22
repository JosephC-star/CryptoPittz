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
   const ribbon=document.createElement('div');ribbon.className='featured-marquee';
   const booth=document.createElement('span');booth.className='featured-booth-label';booth.textContent='PITTZ STREET / BOOTH '+String(shop.booth_number).padStart(2,'0');
   const sticker=document.createElement('span');sticker.className='tag bone-tag featured-community';sticker.textContent='🐾 COMMUNITY MADE';
   ribbon.append(booth,sticker);banner.before(ribbon);
   const signature=document.createElement('div');signature.className='featured-signature';
   const name=document.createElement('span');name.textContent=shop.name;
   const caption=document.createElement('small');caption.textContent='IN THE SPOTLIGHT · MADE BY THE PACK';
   const arrow=document.createElement('span');arrow.className='featured-arrow';arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');
   signature.append(name,caption,arrow);banner.after(signature);
   card.querySelector('.status').textContent='● FEATURED MAKER · A NEW SHOP IN THE SPOTLIGHT EACH DAY';
   card.querySelector('h3').textContent=shop.name;
   const copy=plainCopy(shop.description);card.querySelector('.boothinfo p').textContent=copy.length>240?copy.slice(0,237).replace(/\s+\S*$/,'')+'…':copy||'Step inside and discover what this community maker is creating.';
   const link=card.querySelector('.btn');link.href=href;link.textContent='Visit '+shop.name+' ↗';
  }
 }catch{ /* Keep a useful directory link when the spotlight cannot load. */ }
}
