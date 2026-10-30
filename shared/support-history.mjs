export function supportHistoryQuery(scope,params={}) {
 const offset=Number(params.offset||0);
 if(!Number.isSafeInteger(offset)||offset<0||offset>100000)throw Error('Invalid history page.');
 const order={newest:'purchased_at.desc,tx_hash.desc',oldest:'purchased_at.asc,tx_hash.asc',amount:'bonez_atomic.desc,tx_hash.asc',dollars:'usd_cents.desc.nullslast,tx_hash.asc'}[params.sort||'newest'];
 if(!order)throw Error('Choose a valid sort.');
 const query=new URLSearchParams({scope:'eq.'+scope,select:'tx_hash,booth_id,wallet_address,herotag,public_name,usd_cents,bonez_atomic::text,egld_atomic::text,purchased_at',order,limit:'51',offset:String(offset)});
 if(params.booth){if(!['1','2'].includes(String(params.booth)))throw Error('Choose booth 1 or 2.');query.set('booth_id','eq.'+params.booth);}
 const search=(params.search||'').trim().replace(/^@/,'');
 if(search){if(search.length>100||!/^[-a-zA-Z0-9._]+$/.test(search))throw Error('Search using an ERD, herotag, or transaction hash.');query.set('or',`(wallet_address.ilike.*${search}*,herotag.ilike.*${search}*,tx_hash.ilike.*${search}*)`);}
 for(const [name,operator] of [['start','gte'],['end','lt']])if(params[name]){
  const raw=params[name];if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))throw Error('Choose a valid date.');
  const date=new Date(raw+'T00:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==raw)throw Error('Choose a valid date.');
  if(name==='end')date.setUTCDate(date.getUTCDate()+1);
  query.append('purchased_at',operator+'.'+date.toISOString());
 }
 if(params.start&&params.end&&params.start>params.end)throw Error('The end date must follow the start date.');
 return 'market_support_receipts?'+query;
}
