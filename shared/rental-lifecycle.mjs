export function renewalWindow(expiresAt,months,now=Date.now()){
 const expiry=Date.parse(expiresAt),base=Math.max(now,Number.isFinite(expiry)?expiry:now),start=new Date(base),end=new Date(base);
 end.setUTCDate(1);end.setUTCMonth(end.getUTCMonth()+months);
 const last=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).getUTCDate();end.setUTCDate(Math.min(start.getUTCDate(),last));
 return {expired:Number.isFinite(expiry)&&expiry<=now,startsAt:new Date(base).toISOString(),endsAt:end.toISOString()};
}
export function reminderStage(expiresAt,now=Date.now()){
 const remaining=Date.parse(expiresAt)-now;
 return !Number.isFinite(remaining)||remaining>7*86400000||remaining< -7*86400000?null:remaining<=0?'expired':remaining<=86400000?'one_day':'seven_days';
}
export function reminderMail(job){
 const date=new Date(job.rental_expires_at).toISOString().replace('T',' ').replace('.000Z',' UTC'),ended=job.kind==='expired';
 return {subject:ended?'Your PittzStop booth term has ended':'Your PittzStop booth renewal is coming up',text:(ended?'Your storefront rental term ended on ':'Your storefront rental term ends on ')+date+'.\n\n'+(ended?'Your public shop and merchant editing are paused. Your booth and inventory are retained. Renew with your assigned wallet to reopen the same shop.':'Renew early to keep your storefront available. Added time starts at the end of your current term, so you keep your remaining prepaid time.')+'\n\nReview and renew: https://thepittzstop.com/market-rent\n\nNothing is charged automatically. Review your current rate and approve any payment in your wallet. Key eligibility is checked again at renewal.\n\nTurn off rental reminders in your shop email settings. If your term has just been renewed, check the rental page for the latest status.'};
}
