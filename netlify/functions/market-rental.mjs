import {randomBytes,randomUUID} from 'node:crypto';
import {db,requestOrigin,response,fail,hash,wallet,validSignature} from './market-api.mjs';
import {readJsonRequest} from '../../server/json-request.mjs';
import {RENTAL_TERMS_VERSION} from '../../shared/market-rental-terms.mjs';
import {verifyKeyBenefit} from '../../server/rental-keys.mjs';
import {priceFor,waived,rentalSpec,verifyRentalReceipt,RENTAL_POLICY_VERSION,RENTAL_TOKEN,RENTAL_RECIPIENT} from '../../server/rental-policy.mjs';
const COOKIE='__Host-pittz-rental',UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const enabled=()=>process.env.MARKET_RENTALS_ENABLED==='true',benefitsEnabled=()=>process.env.MARKET_KEY_BENEFITS_ENABLED==='true';
const cookie=(token,age=3600)=>COOKIE+'='+token+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age='+age;
export function rentalLoginMessage(c,nonce){return ['The PittzStop — Storefront rental sign-in','Origin: '+c.origin,'Wallet: '+c.wallet_address,'Challenge: '+c.id,'Nonce: '+nonce,'Expires: '+new Date(c.expires_at).toISOString(),'Verify wallet ownership to review storefront rent. This signature does not take a payment.'].join('\n');}
async function chain(path){const r=await fetch('https://api.multiversx.com/'+path,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)});if(!r.ok)fail(503,'Mainnet confirmation is temporarily unavailable. No additional payment is needed.');return r.json();}
async function identity(event,origin){
 const token=(event.headers?.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
 if(!/^[a-f0-9]{64}$/.test(token||''))fail(401,'Verify your rental wallet first.');
 const rows=await db('market_rental_sessions?token_hash=eq.'+hash(origin+token)+'&origin=eq.'+encodeURIComponent(origin)+'&revoked_at=is.null&expires_at=gt.'+encodeURIComponent(new Date().toISOString())+'&select=*&limit=1');
 if(!rows.length)fail(401,'Rental session expired. Verify your wallet again.');return rows[0];
}
async function owner(address){const rows=await db('market_shops?owner_wallet=eq.'+address+'&select=*&limit=1');const shop=rows[0]||null;if(shop?.moderation_suspended||shop?.access_status==='suspended')fail(403,'This shop is suspended. Contact an administrator.');return shop;}
function publicIntent(r){const quote=priceFor(r.months,r.tier);if(quote.amountAtomic!==String(r.amount_atomic)||r.policy_version!==RENTAL_POLICY_VERSION)fail(409,'Rental policy changed. Contact an administrator before paying.');return {id:r.id,address:r.wallet_address,shopName:r.shop_name,...quote,expectedNonce:String(r.expected_nonce),createdAt:Date.parse(r.created_at),expiresAt:Date.parse(r.expires_at),state:r.state,txHash:r.tx_hash,shopId:r.shop_id,keyIdentifier:r.key_identifier,termsAccepted:r.terms_version===RENTAL_TERMS_VERSION&&!!r.terms_accepted_at,canPay:r.terms_version===RENTAL_TERMS_VERSION&&!!r.terms_accepted_at&&enabled()&&(r.tier==='standard'||r.tier==='waived'||benefitsEnabled())};}
async function loadIntent(id,address){if(!UUID.test(id||''))fail(400,'Invalid rental review.');const rows=await db('market_rental_intents?id=eq.'+id+'&wallet_address=eq.'+address+'&select=*&limit=1');if(!rows.length)fail(404,'Rental review not found.');return rows[0];}
async function currentBenefit(shop,address){return waived(shop)?{tier:'waived'}:verifyKeyBenefit(address);}
async function recheck(r,shop){
 if(r.terms_version!==RENTAL_TERMS_VERSION||!r.terms_accepted_at)fail(409,'Accept the current rental terms in a new review before activating or paying. Cancel this review first.');
 if(r.state!=='review'||Date.parse(r.expires_at)<=Date.now())fail(409,'This rental review expired or was submitted. Check its receipt before starting another.');
 const benefit=waived(shop)?{tier:'waived'}:r.use_standard_rate?{tier:'standard'}:await currentBenefit(shop,r.wallet_address);
 if(benefit.tier!==r.tier||priceFor(r.months,benefit.tier).amountAtomic!==String(r.amount_atomic))fail(409,'Key eligibility changed. Cancel this review and check your current rate.');
 if(!publicIntent(r).canPay)fail(409,'Key benefits are still being finalized. No payment will be requested.');
}
export async function handler(event){try{
 const origin=requestOrigin(event),route=event.queryStringParameters?.route||'me';
 const methods={config:'GET',me:'GET',challenge:'POST',verify:'POST',logout:'POST',quote:'POST',cancel:'POST',reserve:'POST',confirm:'POST',activate:'POST'};
 if(!methods[route])fail(404,'Unknown rental action.');if(event.httpMethod!==methods[route])fail(405,'Unsupported request method.');
 if(event.httpMethod==='POST'&&(event.headers?.origin!==origin||!event.headers?.['content-type']?.startsWith('application/json')))fail(403,'Open rental actions from the market.');
 if(route==='config')return response(200,{enabled:enabled(),benefitsEnabled:benefitsEnabled(),keyRequired:false});
 if(!enabled())fail(503,'Rental enrollment is being connected. Existing shops continue to work.');
 const body=readJsonRequest(event,8192);
 if(route==='challenge'){
  const address=wallet(body.address);await owner(address);
  const recent=await db('market_rental_challenges?wallet_address=eq.'+address+'&created_at=gt.'+encodeURIComponent(new Date(Date.now()-60000).toISOString())+'&select=id&limit=5');if(recent.length>=5)fail(429,'Wait a minute before requesting another wallet message.');
  const nonce=randomBytes(32).toString('hex'),c={id:randomUUID(),wallet_address:address,origin,nonce_hash:hash(nonce),expires_at:new Date(Date.now()+300000).toISOString()};
  await db('market_rental_challenges','POST',c);return response(200,{id:c.id,nonce,message:rentalLoginMessage(c,nonce)});
 }
 if(route==='verify'){
  if(!UUID.test(body.id||'')||!/^[a-f0-9]{64}$/.test(body.nonce||''))fail(400,'Invalid wallet challenge.');
  const rows=await db('market_rental_challenges?id=eq.'+body.id+'&origin=eq.'+encodeURIComponent(origin)+'&used_at=is.null&expires_at=gt.'+encodeURIComponent(new Date().toISOString())+'&select=*&limit=1'),c=rows[0];
  if(!c||c.nonce_hash!==hash(body.nonce)||!await validSignature(c.wallet_address,rentalLoginMessage(c,body.nonce),body.signature))fail(401,'Rental wallet signature could not be verified.');
  await owner(c.wallet_address);
  const consumed=await db('market_rental_challenges?id=eq.'+c.id+'&used_at=is.null&expires_at=gt.'+encodeURIComponent(new Date().toISOString()),'PATCH',{used_at:new Date().toISOString()},{Prefer:'return=representation'});if(consumed.length!==1)fail(401,'Wallet message already used.');
  const token=randomBytes(32).toString('hex');await db('market_rental_sessions','POST',{wallet_address:c.wallet_address,origin,token_hash:hash(origin+token),expires_at:new Date(Date.now()+3600000).toISOString()});return response(200,{address:c.wallet_address},{'Set-Cookie':cookie(token)});
 }
 const auth=await identity(event,origin),address=auth.wallet_address,shop=await owner(address);
 if(route==='logout'){await db('market_rental_sessions?id=eq.'+auth.id,'PATCH',{revoked_at:new Date().toISOString()});return response(200,{signedOut:true},{'Set-Cookie':cookie('',0)});}
 if(route==='me'){
  const rows=await db('market_rental_intents?wallet_address=eq.'+address+'&state=in.(review,submitted,activated)&order=created_at.desc&limit=1');return response(200,{address,shop:shop?{name:shop.name,booth_number:shop.booth_number,access_status:shop.access_status,rental_expires_at:shop.rental_expires_at}:null,intent:rows.length?publicIntent(rows[0]):null});
 }
 if(route==='quote'){
  if(body.acceptTerms!==true||body.termsVersion!==RENTAL_TERMS_VERSION)fail(400,'Acknowledge the final-duration, no-refund and no-proration rental terms before continuing.');
  const months=Number(body.months);if(![1,6,12].includes(months))fail(400,'Choose one, six or twelve months.');
  const name=shop?.name||(typeof body.name==='string'?body.name.trim():'');if(!name||name.length>120)fail(400,'Enter a shop name up to 120 characters.');
  const benefit=waived(shop)?{tier:"waived"}:body.useStandardRate===true?{tier:"standard"}:await currentBenefit(shop,address),price=priceFor(months,benefit.tier),account=await chain('accounts/'+address);
  if(!Number.isSafeInteger(account.nonce)||account.nonce<0)fail(503,'Wallet nonce could not be verified.');
  const r=await db('rpc/market_create_rental','POST',{review_data:{id:randomUUID(),wallet_address:address,origin,months,tier:benefit.tier,amount_atomic:price.amountAtomic,expected_nonce:String(account.nonce),policy_version:RENTAL_POLICY_VERSION,terms_version:RENTAL_TERMS_VERSION,key_identifier:benefit.keyIdentifier||null,use_standard_rate:body.useStandardRate===true,shop_name:name,expires_at:new Date(Date.now()+600000).toISOString()}});
  return response(200,{intent:publicIntent(r)});
 }
 const r=await loadIntent(body.id,address),review=publicIntent(r);
 if(route==='cancel'){
  if(r.state!=='review')fail(409,'Submitted payments cannot be cancelled. Check the saved transaction receipt.');
  const rows=await db('market_rental_intents?id=eq.'+r.id+'&state=eq.review','PATCH',{state:'cancelled'},{Prefer:'return=representation'});if(rows.length!==1)fail(409,'Rental review changed. Refresh.');return response(200,{cancelled:true});
 }
 if(route==='activate'){
  if(BigInt(review.amountAtomic)!==0n)fail(400,'This rental requires a confirmed BONEZ payment.');
  await recheck(r,shop);const activated=await db('rpc/market_activate_rental','POST',{intent_key:r.id,wallet_key:address,receipt_hash:null});return response(200,{activated:true,booth:activated.booth_number});
 }
 if(route==='reserve'){
  if(!/^[a-f0-9]{64}$/.test(body.txHash||''))fail(400,'Invalid signed transaction hash.');
  if(r.state==='submitted'&&r.tx_hash===body.txHash)return response(200,{reserved:true});
  await recheck(r,shop);rentalSpec(address,review);
  const account=await chain('accounts/'+address);if(String(account.nonce)!==String(r.expected_nonce))fail(409,'Wallet nonce changed. Cancel this review before paying.');
  const rows=await db('market_rental_intents?id=eq.'+r.id+'&state=eq.review','PATCH',{state:'submitted',tx_hash:body.txHash},{Prefer:'return=representation'});if(rows.length!==1)fail(409,'This rental is already being submitted. Check the saved receipt.');
  return response(200,{reserved:true});
 }
 if(r.state==='activated')return response(200,{activated:true,booth:shop?.booth_number});
 if(r.state!=='submitted'||!r.tx_hash)fail(409,'No submitted payment is attached to this review.');
 const tx=await chain('transactions/'+r.tx_hash+'?withResults=true');
 if(['pending','received','executing','not-executed'].includes(tx.status)||tx.pendingResults)return response(202,{pending:true,txHash:r.tx_hash});
 try{verifyRentalReceipt(tx,review,r.tx_hash);}catch{fail(409,'This transaction has not produced a matching successful rental receipt. Do not pay again; check Explorer or contact an administrator.');}
 const activated=await db('rpc/market_activate_rental','POST',{intent_key:r.id,wallet_key:address,receipt_hash:r.tx_hash});
 return response(200,{activated:true,booth:activated.booth_number});
}catch(error){return response(error.status||503,{error:error.status?error.message:'Rental service is temporarily unavailable. Check any saved payment before trying again.'});}}
