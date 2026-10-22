// One complete day per merchant, using the market's Central time calendar.
export function featuredShop(shops,date=new Date()){
 const eligible=shops.filter(shop=>shop.name?.trim()).slice().sort((a,b)=>a.booth_number-b.booth_number);
 if(!eligible.length)return null;
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
 const part=type=>parts.find(p=>p.type===type).value;
 const day=Math.floor((Date.UTC(+part('year'),+part('month')-1,+part('day'))-Date.UTC(2026,9,22))/86400000);
 return eligible[((day%eligible.length)+eligible.length)%eligible.length];
}
