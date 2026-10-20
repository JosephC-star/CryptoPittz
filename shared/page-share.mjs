import {escapeHtml} from './shop-share.mjs';
export function pageShareHtml(html,{title,description,url,image,imageAlt}){
 const tags=[['name','description',description],['property','og:type','website'],['property','og:site_name','The PittzStop'],['property','og:title',title],['property','og:description',description],['property','og:url',url],['property','og:image',image],['property','og:image:alt',imageAlt],['name','twitter:card','summary_large_image'],['name','twitter:title',title],['name','twitter:description',description],['name','twitter:image',image]];
 const markup=tags.map(([key,name,value])=>'<meta '+key+'="'+name+'" content="'+escapeHtml(value)+'">').join('\n')+'\n<link rel="canonical" href="'+escapeHtml(url)+'">';
 return html.replace(/<title[^>]*>[\s\S]*?<\/title>/i,()=>'<title>'+escapeHtml(title)+'</title>').replace(/<meta\b[^>]*(?:name|property)\s*=\s*["'](?:description|og:[^"']*|twitter:[^"']*)["'][^>]*>/gi,'').replace(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/gi,'').replace(/<\/head>/i,()=>markup+'\n</head>');
}
