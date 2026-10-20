import {categoryLabel} from './directory-utils.mjs';
// One shared directory for every active storefront, including the original rug shop.
const anchor=document.getElementById('booths');
if(anchor){
 const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
 const section=node('section',undefined,'market-directory');section.id='community-shops';section.setAttribute('aria-labelledby','directory-title');
 const eyebrow=node('p','Made by the pack / Find your next obsession','directory-eyebrow'),heading=node('h2','Meet the shops.');heading.id='directory-title';
 const intro=node('p','Browse the makers, peek at their shelves, and find your corner of the block.','directory-intro');
 const form=node('form',undefined,'directory-search'),label=node('label','Find a shop');label.htmlFor='directory-search';
 const input=node('input');input.id='directory-search';input.type='search';input.maxLength=120;input.placeholder='Search shop names or what they make…';
 const clear=node('button','Clear search','directory-clear');clear.type='button';clear.hidden=true;form.append(label,input,clear);
 const filters=node('div',undefined,'directory-filters');filters.setAttribute('role','group');filters.setAttribute('aria-label','Shop categories');
 const status=node('p','Opening the market directory…','directory-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const grid=node('div',undefined,'directory-grid'),more=node('button','Load more shops','directory-more'),retry=node('button','Try again','directory-more');more.type=retry.type='button';more.hidden=retry.hidden=true;
 section.append(eyebrow,heading,intro,form,filters,status,grid,more,retry);anchor.after(section);
 let category='all',offset=0,requestNumber=0,controller,timer,total=0,loaded=0;
 function price(p){if(!p.price)return 'Ask for price';return (p.currency==='USD'?'$':'')+p.price+(p.currency==='USD'?'':' '+p.currency);}
 function card(shop){
  const article=node('article',undefined,'directory-card'),url='/market-shop?booth='+shop.booth_number;
  const cover=node('a',undefined,'directory-cover');cover.href=url;cover.setAttribute('aria-label','Visit '+shop.name);
  const fallback=node('div',undefined,'directory-cover-fallback');fallback.setAttribute('aria-hidden','true');fallback.append(node('span','🐾'),node('b',shop.name));cover.append(fallback);
  if(shop.cover_url){const img=node('img');img.src=shop.cover_url;img.alt=shop.name+' cover';img.loading='lazy';img.width=800;img.height=300;img.addEventListener('error',()=>img.remove(),{once:true});cover.append(img);}
  const body=node('div',undefined,'directory-card-body'),booth=node('p','Booth '+String(shop.booth_number).padStart(2,'0')+' · Community merchant','directory-booth'),title=node('h3'),titleLink=node('a',shop.name);titleLink.href=url;title.append(titleLink);
  const tags=node('div',undefined,'directory-tags');for(const c of shop.categories||[])tags.append(node('span',categoryLabel(c)));
  const description=node('p',shop.description||'A new maker is settling into the market.','directory-description');
  const shelf=node('div',undefined,'directory-shelf');
  for(const product of shop.previews||[]){const item=node('a',undefined,'directory-product');item.href=url;item.setAttribute('aria-label',product.name+' · '+(product.sold_out?'Sold out':price(product)));const visual=node('span',undefined,'directory-product-visual');visual.setAttribute('aria-hidden','true');visual.textContent='🐾';if(product.image_url){const img=node('img');img.src=product.image_url;img.alt='';img.loading='lazy';img.width=180;img.height=180;img.addEventListener('error',()=>img.remove(),{once:true});visual.append(img);}item.append(visual,node('b',product.name),node('small',product.sold_out?'Sold out':price(product)));shelf.append(item);}
  if(!shop.previews?.length)shelf.append(node('p','Stocking the shelves · You can still contact this merchant.','directory-shelf-empty'));
  const footer=node('div',undefined,'directory-card-footer'),count=node('span',shop.product_count===1?'1 published item':shop.product_count+' published items'),visit=node('a','Visit shop ↗','directory-visit');visit.href=url;footer.append(count,visit);
  body.append(booth,title,tags,description,shelf,footer);article.append(cover,body);return article;
 }
 function renderFilters(categories){filters.replaceChildren();for(const c of [{id:'all',label:'All shops'},...categories]){const button=node('button',c.label+(c.count===undefined?'':' · '+c.count));button.type='button';button.setAttribute('aria-pressed',String(category===c.id));button.addEventListener('click',()=>{category=c.id;clearTimeout(timer);load();});filters.append(button);}}
 async function load(append=false){
  const current=++requestNumber;controller?.abort();controller=new AbortController();if(!append){offset=0;loaded=0;grid.replaceChildren();}status.textContent=append?'Loading more shops…':'Finding your shops…';section.setAttribute('aria-busy','true');more.disabled=true;retry.hidden=true;clear.hidden=!input.value&&! (category!=='all');
  try{const params=new URLSearchParams({route:'shops',q:input.value.trim(),category,offset:String(offset)});const r=await fetch('/.netlify/functions/market-api?'+params,{cache:'no-store',signal:controller.signal});const data=await r.json();if(!r.ok)throw Error(data.error||'Shop directory unavailable.');if(current!==requestNumber)return;
   total=data.total;for(const shop of data.shops){grid.append(card(shop));loaded++;}offset=data.nextOffset;more.hidden=!data.hasMore;
   renderFilters(data.categories||[]);status.textContent=total?'Showing '+loaded+' of '+total+' '+(total===1?'shop':'shops')+'.':'No shops match this search. Try another category or clear the search.';
  }catch(error){if(error.name==='AbortError'||current!==requestNumber)return;status.textContent='The shop directory could not load. Try again, or explore the featured booths above.';retry.hidden=false;more.hidden=true;}
  finally{if(current===requestNumber){section.removeAttribute('aria-busy');more.disabled=false;}}
 }
 form.addEventListener('submit',e=>{e.preventDefault();clearTimeout(timer);load();});input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>load(),250);});
 clear.addEventListener('click',()=>{input.value='';category='all';load();input.focus();});more.addEventListener('click',()=>load(true));retry.addEventListener('click',()=>load());load();
}
