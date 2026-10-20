export function renewalWindow(expiresAt,months,now=Date.now()){
 const expiry=Date.parse(expiresAt),base=Math.max(now,Number.isFinite(expiry)?expiry:now),start=new Date(base),end=new Date(base);
 end.setUTCDate(1);end.setUTCMonth(end.getUTCMonth()+months);
 const last=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).getUTCDate();end.setUTCDate(Math.min(start.getUTCDate(),last));
 return {expired:Number.isFinite(expiry)&&expiry<=now,startsAt:new Date(base).toISOString(),endsAt:end.toISOString()};
}
