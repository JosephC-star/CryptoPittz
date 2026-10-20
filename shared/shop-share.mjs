export function escapeHtml(value){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
export function shopPageHtml(html,shop,origin){
 const title=shop.name+' · Pittz Flea Market',description=(shop.description||'Shop creations from the Pittz community. Contact this merchant to arrange a purchase.').replace(/\s+/g,' ').slice(0,200),url=origin+'/market-shop?booth='+shop.booth_number;
 const image=new URL(shop.cover_url||'/flea-market/assets/pittz-street-market.png',origin).href;
 const tags=[['property','og:type','website'],['property','og:site_name','The PittzStop'],['property','og:title',title],['property','og:description',description],['property','og:url',url],['property','og:image',image],['property','og:image:alt',shop.name+' storefront cover'],['name','twitter:card','summary_large_image'],['name','twitter:title',title],['name','twitter:description',description],['name','twitter:image',image],['name','description',description]];
 const markup=tags.map(([key,name,value])=>'<meta '+key+'="'+name+'" content="'+escapeHtml(value)+'">').join('\n')+'\n<link rel="canonical" href="'+escapeHtml(url)+'">';
 // Replace existing metadata so link scrapers cannot pick an earlier generic title.
 html=html.replace(/<title[^>]*>[\s\S]*?<\/title>/i,()=>'<title>'+escapeHtml(title)+'</title>').replace(/<meta\b[^>]*(?:name|property)\s*=\s*["'](?:description|og:[^"']*|twitter:[^"']*)["'][^>]*>/gi,'').replace(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/gi,'');
 return html.replace(/<\/head>/i,()=>markup+'\n</head>');
}
