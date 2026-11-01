const positive=value=>{const number=Number(value);return Number.isFinite(number)&&number>0?number:null;};
export function comparePittzNumber(a,b){
 const an=a.name?.match(/#(\d+)/)?.[1],bn=b.name?.match(/#(\d+)/)?.[1];
 if(an&&bn){const difference=Number(an)-Number(bn);if(difference)return difference;}
 return (a.name||a.identifier||'').localeCompare(b.name||b.identifier||'',undefined,{numeric:true})||(a.identifier||'').localeCompare(b.identifier||'');
}
export function compareListingValues(a,b,sort){
 const byDate=sort==='newest'||sort==='oldest';
 const av=positive(byDate?a?.listedAt:a?.dollarValue),bv=positive(byDate?b?.listedAt:b?.dollarValue);
 // Missing market estimates/dates always follow known values in either direction.
 if(av===null)return bv===null?0:1;
 if(bv===null)return -1;
 return sort==='price-desc'||sort==='newest'?bv-av:av-bv;
}
