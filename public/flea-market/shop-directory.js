// New merchants use one shared storefront; no hand-built booth pages are needed.
(async()=>{
 try{
  const r=await fetch('/.netlify/functions/market-api?route=shops',{cache:'no-store'});if(!r.ok)return;
  const data=await r.json(),shops=data.shops.filter(shop=>shop.booth_number!==1);if(!shops.length)return;
  const section=document.createElement('section');section.id='community-shops';
  const title=document.createElement('h2');title.textContent='More shops on the block.';section.append(title);
  const grid=document.createElement('div');grid.className='booths';section.append(grid);
  for(const shop of shops){
   const card=document.createElement('article');card.className='booth';
   const photo=document.createElement('img');photo.src='/.netlify/functions/market-api?route=shop-image&booth='+shop.booth_number+'&kind=cover';photo.alt=shop.name+' cover';photo.loading='lazy';photo.style.cssText='width:100%;aspect-ratio:8/3;object-fit:cover;display:block';photo.onerror=()=>photo.remove();card.append(photo);
   const body=document.createElement('div');body.className='boothinfo';
   const booth=document.createElement('div');booth.className='status';booth.textContent='BOOTH '+shop.booth_number+' / COMMUNITY MERCHANT';
   const heading=document.createElement('h3');heading.textContent=shop.name;
   const description=document.createElement('p');description.textContent=shop.description;
   const link=document.createElement('a');link.className='btn';link.href='/market-shop?booth='+shop.booth_number;link.textContent='Visit this shop ↗';
   body.append(booth,heading,description,link);card.append(body);grid.append(card);
  }
  document.getElementById('booths').insertAdjacentElement('afterend',section);
 }catch{/* The existing market stays usable during a directory outage. */}
})();
