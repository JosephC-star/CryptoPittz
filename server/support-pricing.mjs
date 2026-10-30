import {createHmac,timingSafeEqual} from 'node:crypto';
import {validSupportUsd} from '../shared/support-denominations.mjs';
function key(secret){if(typeof secret!=='string'||secret.length<20)throw Error('Purchase pricing is not configured.');return secret;}
function mac(payload,secret){return createHmac('sha256',key(secret)).update('pittz-support-preset-v1|'+payload).digest();}
export function issuePreset({origin,booth,usd,price,issued=Date.now()},secret){
 if(!validSupportUsd(usd))throw Error('Choose $10 to $100 in $10 increments.');
 if(![1,2].includes(booth)||!Number.isFinite(price)||price<=0||price>1000000)throw Error('Live market pricing is unavailable.');
 const egld_price_usd=price.toFixed(8),scaled=BigInt(egld_price_usd.replace('.',''));
 if(scaled<=0n)throw Error('Live market pricing is unavailable.');
 const egld_atomic=(BigInt(usd)*10n**26n/scaled).toString();
 const data={origin,booth,usd,egld_price_usd,egld_atomic,issued:Math.floor(issued/1000),expires:Math.floor(issued/1000)+300};
 const payload=Buffer.from(JSON.stringify(data)).toString('base64url');
 return {...data,pricingToken:payload+'.'+mac(payload,secret).toString('base64url')};
}
export function readPreset(token,{origin,booth},secret){
 if(typeof token!=='string'||token.length>2000)throw Error('A verified purchase price is required.');
 const parts=token.split('.');if(parts.length!==2)throw Error('Invalid purchase price.');
 const expected=mac(parts[0],secret),received=Buffer.from(parts[1],'base64url');
 if(received.length!==expected.length||!timingSafeEqual(received,expected))throw Error('The purchase price could not be verified.');
 let p;try{p=JSON.parse(Buffer.from(parts[0],'base64url').toString());}catch{throw Error('Invalid purchase price.');}
 if(p.origin!==origin||p.booth!==booth||!validSupportUsd(p.usd)||!/^\d+$/.test(p.egld_atomic)||!Number.isSafeInteger(p.issued)||p.expires!==p.issued+300)throw Error('The purchase price does not match this booth.');
 return p;
}
export function pricedPurchase(preset,purchase){
 const time=Date.parse(purchase.purchased_at)/1000;
 if(preset.egld_atomic!==purchase.egld_atomic||time<preset.issued||time>preset.expires)throw Error('This transaction does not match the verified purchase price and time.');
 return {usd_cents:preset.usd*100,egld_price_usd:preset.egld_price_usd};
}
