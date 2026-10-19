// Categories describe public shop copy; never infer from private drafts or inquiries.
export const SHOP_CATEGORIES=Object.freeze([
 {id:'home',label:'Home & rugs',pattern:/\b(rugs?|tuft(?:ed|ing)?|home|decor|furniture|candles?|blankets?|pillows?)\b/i},
 {id:'clothing',label:'Clothing & accessories',pattern:/\b(cloth(?:ing|es)?|shirts?|hoodies?|apparel|hats?|caps?|jewel(?:ry|lery)|accessor(?:y|ies)|bags?|wear)\b/i},
 {id:'collectibles',label:'Art & collectibles',pattern:/\b(arts?|prints?|collectibles?|collectors?|cards?|figures?|paintings?|sculptures?|nfts?)\b/i},
 {id:'digital',label:'Digital goods',pattern:/\b(digital|downloads?|templates?|software|music|beats?|designs?)\b/i},
 {id:'custom',label:'Custom & handmade',pattern:/\b(custom|handmade|handcrafted|hand[- ]tufted|personalized|commissions?|made[- ]to[- ]order)\b/i},
 {id:'other',label:'Other finds',pattern:null}
]);
export function shopCategories(shop){const copy=[shop.name,shop.description].filter(Boolean).join(' ');const matches=SHOP_CATEGORIES.filter(c=>c.pattern?.test(copy)).map(c=>c.id);return matches.length?matches:['other'];}
export function categoryLabel(id){return SHOP_CATEGORIES.find(c=>c.id===id)?.label||'Other finds';}
export function matchesShop(shop,query='',category='all'){return (category==='all'||shopCategories(shop).includes(category))&&query.toLowerCase().trim().split(/\s+/).every(word=>(shop.name+' '+shop.description).toLowerCase().includes(word));}
