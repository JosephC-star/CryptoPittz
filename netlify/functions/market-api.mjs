import {featuredShop} from '../../shared/featured-shop.mjs';
import {GALLERY_SLOTS,galleryFileName} from '../../shared/market-product-media.mjs';
import {SHOP_CATEGORIES,shopCategories,matchesShop} from '../../public/flea-market/directory-utils.mjs';
import {readJsonRequest} from '../../server/json-request.mjs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { Address, Message, MessageComputer, UserVerifier } from '@multiversx/sdk-core';

const ORIGIN = 'https://deploy-preview-17--cryptopittz.netlify.app';
const ALLOWED_ORIGINS = new Set([ORIGIN, 'https://deploy-preview-49--cryptopittz.netlify.app', 'https://deploy-preview-18--cryptopittz.netlify.app', 'https://deploy-preview-29--cryptopittz.netlify.app', 'https://deploy-preview-32--cryptopittz.netlify.app', 'https://deploy-preview-33--cryptopittz.netlify.app', 'https://thepittzstop.com', 'https://www.thepittzstop.com', 'https://cryptopittz.netlify.app']);
if(/^https:\/\/deploy-preview-\d+--cryptopittz\.netlify\.app$/.test(process.env.DEPLOY_PRIME_URL||''))ALLOWED_ORIGINS.add(process.env.DEPLOY_PRIME_URL);
const COOKIE = '__Host-pittz-market';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hash = text => createHash('sha256').update(text).digest('hex');
function requestOrigin(event) {
  let origin;
  try { origin = new URL(event.rawUrl).origin; } catch { fail(403, 'Open the market on The PittzStop.'); }
  if (!ALLOWED_ORIGINS.has(origin)) fail(403, 'Open the market on The PittzStop.');
  return origin;
}
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const now = () => new Date().toISOString();
export function wallet(value) {
  try { if (typeof value !== 'string' || !value.startsWith('erd1') || Address.newFromBech32(value).toBech32() !== value) throw Error(); return value; }
  catch { fail(400, 'A valid public erd1 wallet address is required.'); }
}
export function active(shop) {
  return !!shop && !shop.moderation_suspended && (shop.access_status === 'test' || (shop.access_status === 'active' && Date.parse(shop.rental_expires_at) > Date.now()));
}
export function loginMessage(challenge, nonce) {
  return ['The PittzStop — Merchant sign-in', 'Origin: ' + challenge.origin,
    'Wallet: ' + challenge.wallet_address, 'Challenge: ' + challenge.id,
    'Nonce: ' + nonce, 'Expires: ' + new Date(challenge.expires_at).toISOString(),
    'Sign in to manage your assigned booth. No payment or blockchain transaction.'].join('\n');
}
export async function validSignature(address, message, signature) {
  if (typeof signature !== 'string' || !/^[0-9a-f]{128}$/i.test(signature)) return false;
  try { return await UserVerifier.fromAddress(Address.newFromBech32(address)).verify(
    new MessageComputer().computeBytesForVerifying(new Message({ data: Buffer.from(message) })), Buffer.from(signature, 'hex'));
  } catch { return false; }
}
export function productInput(body, shopId) {
  const text = (name, max, required = false) => {
    const v = typeof body[name] === 'string' ? body[name].trim() : '';
    if (v.length > max || (required && !v)) fail(400, 'Check the product ' + name + '.');
    return v;
  };
  const name = text('name', 120, true), description = text('description', 5000);
  const price = body.price === '' || body.price === null || body.price === undefined ? null : String(body.price);
  if (price !== null && (!/^(?:0|[1-9]\d{0,17})(?:\.\d{1,18})?$/.test(price) || !/[1-9]/.test(price))) fail(400, 'Enter a positive price without commas.');
  const currency = body.currency || 'USD', status = body.status || 'draft';
  if (!['USD','EGLD','BONEZ'].includes(currency) || !['draft','published','archived'].includes(status)) fail(400, 'Invalid product settings.');
  const quantity = Number(body.quantity);
  if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 1000000 || typeof body.made_to_order !== 'boolean') fail(400, 'Check the quantity and availability.');
  const image_path = body.image_path || null;
  if (image_path && (typeof image_path !== 'string' || !image_path.startsWith(shopId + '/') || !new RegExp('^' + shopId + '/[0-9a-f-]{36}\\.(jpg|png|webp)$').test(image_path))) fail(400, 'The image does not belong to this shop.');
  return { name, description, price, currency, quantity, made_to_order: body.made_to_order, delivery: text('delivery', 240), status, image_path, updated_at: now() };
}
function configuration() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!key || !url) fail(503, 'Merchant storage is not configured.');
  let parsed; try { parsed = new URL(url); } catch { fail(503, 'Merchant storage configuration needs attention.'); }
  if (parsed.origin !== 'https://xqdrecxqkldhznydglev.supabase.co' || !['','/'].includes(parsed.pathname) || parsed.search || parsed.hash) fail(503, 'Merchant storage configuration needs attention.');
  const headers = { apikey: key };
  if (!key.startsWith('sb_secret_')) headers.Authorization = 'Bearer ' + key;
  return { origin: parsed.origin, headers };
}
async function request(path, method = 'GET', body, extra = {}) {
  const config = configuration();
  const headers = { ...config.headers, ...extra };
  if (body !== undefined && !Buffer.isBuffer(body)) headers['Content-Type'] = 'application/json';
  const result = await fetch(config.origin + path, { method, headers, body: body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!result.ok) fail(503, 'Merchant storage request failed. Please try again.');
  if (result.status === 204) return null;
  const content = await result.text(); return content ? JSON.parse(content) : null;
}
const db = (path, method, body, headers) => request('/rest/v1/' + path, method, body, headers);
async function ownerShop(address) {
  const shops = await db('market_shops?owner_wallet=eq.' + encodeURIComponent(address) + '&select=*&limit=1');
  if (shops?.[0]?.moderation_suspended) fail(403, 'This storefront is suspended. Reason: ' + (shops[0].moderation_reason || 'Contact a market administrator.'));
  if (!active(shops?.[0])) fail(403, 'This wallet does not have an active assigned booth.');
  return shops[0];
}
function tokenFrom(event) {
  return (event.headers?.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
}
async function session(event) {
  const token = tokenFrom(event);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) fail(401, 'Sign in to your merchant backroom.');
  const sessions = await db('market_sessions?token_hash=eq.' + hash(requestOrigin(event) + token) + '&revoked_at=is.null&expires_at=gt.' + encodeURIComponent(now()) + '&select=*&limit=1');
  const current = sessions?.[0];
  if (!current) fail(401, 'Your merchant session expired. Sign in again.');
  const shop = await ownerShop(current.wallet_address);
  if (shop.id !== current.shop_id) fail(403, 'This booth assignment has changed. Sign in again.');
  return { current, shop };
}
function response(statusCode, body, headers = {}) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers }, body: JSON.stringify(body) };
}
function cookie(token, maxAge = 7200) { return COOKIE + '=' + token + '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=' + maxAge; }
const imageRoute = id => '/.netlify/functions/market-api?route=image&product=' + id;
const shopPhotoUrl = (booth,kind) => '/.netlify/functions/market-api?route=shop-image&booth='+booth+'&kind='+kind;
async function appearance(shop){
  const files=await request('/storage/v1/object/list/market-product-images','POST',{prefix:shop.id,limit:100,search:'storefront-'});
  const has=kind=>Array.isArray(files)&&files.some(file=>file.name==='storefront-'+kind+'.jpg');
  return {cover_url:has('cover')?shopPhotoUrl(shop.booth_number,'cover'):null,default_image_url:has('default')?shopPhotoUrl(shop.booth_number,'default'):null};
}
const withImage = p => ({ ...p, image_url: p.image_path ? imageRoute(p.id) : null });
async function galleryFiles(shop){
 const files=await request('/storage/v1/object/list/market-product-images','POST',{prefix:shop.id,limit:500,search:'gallery-'});
 return new Set(Array.isArray(files)?files.map(file=>file.name):[]);
}
function withGallery(product,files,defaultUrl=null){
 const primary=product.image_path?imageRoute(product.id):null;
 const photos=GALLERY_SLOTS.filter(slot=>files.has(galleryFileName(product.id,slot))).map(slot=>({slot,url:imageRoute(product.id)+'&slot='+slot}));
 const urls=[primary,...photos.map(p=>p.url)].filter(Boolean);
 return {...product,primary_image_url:primary,gallery_photos:photos,image_urls:urls.length?urls:defaultUrl?[defaultUrl]:[],image_url:urls[0]||defaultUrl};
}

export async function handler(event) {
  try {
    const actualOrigin = requestOrigin(event);
    const route = event.queryStringParameters?.route || 'me';
    const allowed = { appearance:'GET', 'shop-photo':'POST', 'product-photo':'POST', 'shop-image':'GET', overview:'GET', me:'GET', shops:'GET', featured:'GET', catalog:'GET', image:'GET', products:'GET', challenge:'POST', verify:'POST', logout:'POST', product:'POST', upload:'POST', shop:'POST', inquiry:'POST', inquiries:'GET', 'inquiry-status':'POST', 'inquiry-reference':'GET' };
    if (!allowed[route]) fail(404, 'Unknown merchant action.');
    if (event.httpMethod !== allowed[route]) fail(405, 'Unsupported request method.');
    if (event.httpMethod !== 'GET' && event.headers?.origin !== actualOrigin) fail(403, 'Open this action from the market.');
    if (event.httpMethod !== 'GET' && !event.headers?.['content-type']?.startsWith('application/json')) fail(415, 'JSON required.');
    const largeUpload = ['upload','inquiry','shop-photo','product-photo'].includes(route);
    const body = readJsonRequest(event, largeUpload ? 2900000 : 32768, largeUpload ? 'The request is too large. Use an image under 2 MB.' : 'This request is too large. Please shorten the text and try again.');

    if (route === 'challenge') {
      const address = wallet(body.address); await ownerShop(address);
      const recent = await db('market_login_challenges?wallet_address=eq.' + address + '&created_at=gt.' + encodeURIComponent(new Date(Date.now() - 60000).toISOString()) + '&select=id&limit=5');
      if (recent.length >= 5) fail(429, 'Wait a minute before requesting another login message.');
      const nonce = randomBytes(32).toString('hex');
      const challenge = { id:randomUUID(), wallet_address:address, nonce_hash:hash(nonce), origin:actualOrigin, expires_at:new Date(Date.now() + 300000).toISOString() };
      await db('market_login_challenges','POST',challenge);
      return response(200,{ id:challenge.id, nonce, message:loginMessage(challenge,nonce), expiresAt:challenge.expires_at });
    }
    if (route === 'verify') {
      if (!UUID.test(body.id) || !/^[0-9a-f]{64}$/.test(body.nonce)) fail(400, 'Invalid login challenge.');
      const rows = await db('market_login_challenges?id=eq.' + body.id + '&used_at=is.null&expires_at=gt.' + encodeURIComponent(now()) + '&select=*&limit=1');
      const challenge = rows?.[0];
      if (!challenge || challenge.origin !== actualOrigin || challenge.nonce_hash !== hash(body.nonce)) fail(401, 'Login message expired or was already used.');
      if (!await validSignature(challenge.wallet_address, loginMessage(challenge,body.nonce), body.signature)) fail(401, 'The wallet signature could not be verified.');
      const shop = await ownerShop(challenge.wallet_address);
      const consumed = await db('market_login_challenges?id=eq.' + body.id + '&used_at=is.null&expires_at=gt.' + encodeURIComponent(now()) + '&select=id', 'PATCH', { used_at:now() }, { Prefer:'return=representation' });
      if (consumed?.length !== 1) fail(401, 'This login message has already been used.');
      const token = randomBytes(32).toString('hex');
      await db('market_sessions','POST',{shop_id:shop.id,wallet_address:challenge.wallet_address,token_hash:hash(actualOrigin+token),expires_at:new Date(Date.now()+7200000).toISOString()});
      return response(200,{ shop },{'Set-Cookie':cookie(token)});
    }
    if (route === 'featured') {
      const rows=await db('market_shops?moderation_suspended=eq.false&access_status=in.(test,active)&select=id,booth_number,name,description,access_status,rental_expires_at,moderation_suspended&order=booth_number.asc&limit=500');
      const shop=featuredShop(rows.filter(active));
      return response(200,{shop:shop?{booth_number:shop.booth_number,name:shop.name,description:shop.description,cover_url:(await appearance(shop)).cover_url}:null});
    }
    if(route==='shops'){
      const query=event.queryStringParameters?.q||'',category=event.queryStringParameters?.category||'all';
      const offset=Number(event.queryStringParameters?.offset||0),pageSize=12;
      if(typeof query!=='string'||query.length>120||!Number.isSafeInteger(offset)||offset<0||offset>500||!(category==='all'||SHOP_CATEGORIES.some(c=>c.id===category)))fail(400,'Check the shop search and category.');
      const rows=await db('market_shops?moderation_suspended=eq.false&access_status=in.(test,active)&select=id,booth_number,name,description,access_status,rental_expires_at,moderation_suspended&order=booth_number.asc&limit=500');
      const live=rows.filter(active),matching=live.filter(shop=>matchesShop(shop,query,category));
      const page=matching.slice(offset,offset+pageSize),shops=[];
      // Keep catalog reads bounded and avoid a burst of storage requests as the market grows.
      for(let i=0;i<page.length;i+=3){
        const group=await Promise.all(page.slice(i,i+3).map(async shop=>{
          const products=await db('market_products?shop_id=eq.'+shop.id+'&status=eq.published&moderation_hidden=eq.false&select=id,name,price,currency,image_path,quantity,made_to_order&order=created_at.desc&limit=100');
          const [photos,files]=await Promise.all([appearance(shop),galleryFiles(shop)]);
          return {booth_number:shop.booth_number,name:shop.name,description:shop.description,categories:shopCategories(shop),cover_url:photos.cover_url,product_count:products.length,previews:products.slice(0,3).map(p=>({id:p.id,name:p.name,price:p.price,currency:p.currency,sold_out:!p.made_to_order&&p.quantity===0,image_url:withGallery(p,files,photos.default_image_url).image_url}))};
        }));shops.push(...group);
      }
      return response(200,{shops,total:matching.length,hasMore:offset+pageSize<matching.length,nextOffset:offset+pageSize,categories:SHOP_CATEGORIES.map(c=>({id:c.id,label:c.label,count:live.filter(shop=>matchesShop(shop,query,c.id)).length}))});
    }
    if (route === 'catalog') {
      const booth = Number(event.queryStringParameters?.booth || 1);
      if (!Number.isSafeInteger(booth) || booth < 1) fail(400,'Invalid booth.');
      const shops = await db('market_shops?booth_number=eq.'+booth+'&select=id,booth_number,name,description,access_status,rental_expires_at,moderation_suspended&limit=1');
      const shop = shops?.[0]; if (!active(shop)) fail(404,'This storefront is not available.');
      const products = await db('market_products?shop_id=eq.'+shop.id+'&status=eq.published&moderation_hidden=eq.false&select=id,name,description,price,currency,quantity,made_to_order,delivery,image_path&order=created_at.desc&limit=100');
      const [photos,files]=await Promise.all([appearance(shop),galleryFiles(shop)]);
      return response(200,{shop:{id:shop.id,name:shop.name,description:shop.description,booth_number:shop.booth_number,...photos},products:products.map(p=>withGallery(p,files,photos.default_image_url))});
    }
    if(route==='shop-image'){
      const booth=Number(event.queryStringParameters?.booth),kind=event.queryStringParameters?.kind;
      if(!Number.isSafeInteger(booth)||booth<1||!['cover','default'].includes(kind))fail(400,'Invalid shop picture.');
      const shops=await db('market_shops?booth_number=eq.'+booth+'&select=*&limit=1'),target=shops?.[0];
      if(!active(target))fail(404,'Shop picture not available.');
      const photos=await appearance(target);
      if(!photos[kind==='cover'?'cover_url':'default_image_url'])fail(404,'Shop picture not found.');
      const signed=await request('/storage/v1/object/sign/market-product-images/'+target.id+'/storefront-'+kind+'.jpg','POST',{expiresIn:60});
      const location=new URL('/storage/v1'+signed.signedURL,configuration().origin);
      if(location.origin!==configuration().origin)fail(503,'Picture could not be opened.');
      return response(302,{}, {Location:location.href});
    }
    if (route === 'image') {
      const id=event.queryStringParameters?.product;if(!UUID.test(id))fail(400,'Invalid product.');
      const rows=await db('market_products?id=eq.'+id+'&select=id,shop_id,status,image_path,moderation_hidden,currency&limit=1');const product=rows?.[0];
      const slot=Number(event.queryStringParameters?.slot||0);
      if(!Number.isSafeInteger(slot)||slot<0||slot>4)fail(400,'Invalid gallery picture.');
      if(!product||(!slot&&!product.image_path))fail(404,'Image not found.');
      if(product.status==='published'&&!product.moderation_hidden){
        const shops=await db('market_shops?id=eq.'+product.shop_id+'&select=access_status,rental_expires_at,moderation_suspended&limit=1');
        if(!active(shops?.[0]))fail(404,'Image not available.');
      }else{const auth=await session(event);if(auth.shop.id!==product.shop_id)fail(404,'Image not available.');}
      const path=slot?product.shop_id+'/'+galleryFileName(id,slot):product.image_path;
      if(!path.startsWith(product.shop_id+'/')||path.includes('..'))fail(404,'Image not available.');
      if(slot&&!(await galleryFiles({id:product.shop_id})).has(galleryFileName(id,slot)))fail(404,'Image not found.');
      const signed=await request('/storage/v1/object/sign/market-product-images/'+path,'POST',{expiresIn:60});
      const location=new URL('/storage/v1'+signed.signedURL,configuration().origin);
      if(location.origin!==configuration().origin)fail(503,'Image could not be opened.');
      return response(302,{}, {Location:location.href});
    }

    if(route==='inquiry'){
      if(body.website)fail(400,'This inquiry could not be accepted.');
      const name=typeof body.name==='string'?body.name.trim():'';
      const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
      const message=typeof body.message==='string'?body.message.trim():'';
      const reference=body.reference?imageInput(body.reference):null;
      if(!name||name.length>120||email.length>320||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||/[\r\n<>]/.test(email)||message.length>5000||(!message&&!reference)||body.consent!==true)fail(400,'Add your name, a valid email, and a message or reference picture. Confirm sharing with the merchant.');
      const booth=Number(body.booth);
      if(!Number.isSafeInteger(booth)||booth<1)fail(400,'Invalid booth.');
      if(!UUID.test(body.request_id))fail(400,'Refresh the page before sending this inquiry.');
      const shops=await db('market_shops?booth_number=eq.'+booth+'&select=id,access_status,rental_expires_at,moderation_suspended&limit=1');const target=shops?.[0];
      if(!active(target))fail(404,'This shop is not accepting inquiries.');
      const existing=await db('market_inquiries?id=eq.'+body.request_id+'&shop_id=eq.'+target.id+'&customer_email=eq.'+encodeURIComponent(email)+'&select=id&limit=1');
      if(existing?.length)return response(200,{received:true,reference:body.request_id,message:'This inquiry is already saved in the merchant’s inbox. No order or payment has been placed.'});
      let productId=null;
      if(body.product_id){
        if(!UUID.test(body.product_id))fail(400,'Invalid product.');
        const products=await db('market_products?id=eq.'+body.product_id+'&shop_id=eq.'+target.id+'&status=eq.published&moderation_hidden=eq.false&select=id&limit=1');
        if(products?.length!==1)fail(404,'This product is no longer available for inquiries.');
        productId=products[0].id;
      }
      const ip=event.headers?.['x-nf-client-connection-ip'];
      if(!isIP(ip||''))fail(503,'This inquiry could not be verified. Please try again.');
      const salt=configuration().headers.apikey;
      const reserved=await db('rpc/market_reserve_inquiry','POST',{ip_hash:hash(salt+'|ip|'+ip),email_hash:hash(salt+'|email|'+email),shop_key:target.id});
      if(reserved!==true)fail(429,'Too many inquiries. Please try again later.');
      const id=body.request_id;let referencePath=null;
      try{
        if(reference){referencePath=target.id+'/'+randomUUID()+'.'+reference.extension;await request('/storage/v1/object/market-inquiry-references/'+referencePath,'POST',reference.bytes,{'Content-Type':reference.type,'x-upsert':'false'});}
        await db('market_inquiries','POST',{id,shop_id:target.id,product_id:productId,customer_name:name,customer_email:email,message,reference_image_path:referencePath});
      }catch(error){if(referencePath)try{await request('/storage/v1/object/market-inquiry-references','DELETE',{prefixes:[referencePath]});}catch{}throw error;}
      return response(201,{received:true,reference:id,message:'Your inquiry is saved in the merchant’s inbox. The merchant can reply to your email. No order or payment has been placed.'});
    }
    const auth=await session(event),shop=auth.shop;
    if(route==='appearance')return response(200,await appearance(shop));
    if(route==='shop-photo'){
      if(!['cover','default'].includes(body.kind))fail(400,'Choose a cover or default inventory picture.');
      const path=shop.id+'/storefront-'+body.kind+'.jpg';
      if(body.remove===true){await request('/storage/v1/object/market-product-images','DELETE',{prefixes:[path]});}
      else{const {bytes,type}=imageInput(body);await request('/storage/v1/object/market-product-images/'+path,'POST',bytes,{'Content-Type':type,'x-upsert':'true'});}
      return response(200,{saved:true});
    }
    if(route==='product-photo'){
      const slot=Number(body.slot);
      if(!UUID.test(body.id||'')||!GALLERY_SLOTS.includes(slot))fail(400,'Choose a valid product picture slot.');
      const rows=await db('market_products?id=eq.'+body.id+'&shop_id=eq.'+shop.id+'&select=id&limit=1');
      if(rows.length!==1)fail(404,'Product not found in your shop.');
      const path=shop.id+'/'+galleryFileName(body.id,slot);
      if(body.remove===true)await request('/storage/v1/object/market-product-images','DELETE',{prefixes:[path]});
      else{const {bytes,type}=imageInput(body);await request('/storage/v1/object/market-product-images/'+path,'POST',bytes,{'Content-Type':type,'x-upsert':'true'});}
      await db('market_products?id=eq.'+body.id+'&shop_id=eq.'+shop.id,'PATCH',{updated_at:now()});
      return response(200,{saved:true});
    }
    if(route==='overview'){
      const [term,contact,unread]=await Promise.all([
        db('market_rental_intents?shop_id=eq.'+shop.id+'&wallet_address=eq.'+shop.owner_wallet+'&state=eq.activated&select=tier,months,activated_at&order=activated_at.desc&limit=1'),
        db('market_alert_contacts?shop_id=eq.'+shop.id+'&owner_wallet=eq.'+shop.owner_wallet+'&select=enabled,verified_at&limit=1'),
        db('market_inquiries?shop_id=eq.'+shop.id+'&status=eq.new&select=id&limit=1001')
      ]);
      return response(200,{rental:{tier:term[0]?.tier||(shop.rental_fee_waived||shop.access_status==='test'?'waived':null),months:term[0]?.months||null,expiresAt:shop.rental_expires_at||null,accessStatus:shop.access_status},alertsEnabled:contact[0]?.enabled===true&&!!contact[0]?.verified_at,unreadCount:Math.min(unread.length,1000),unreadCapped:unread.length>1000});
    }
    if(route==='me')return response(200,{shop});
    if(route==='logout'){
      await db('market_sessions?id=eq.'+auth.current.id,'PATCH',{revoked_at:now()});
      return response(200,{signedOut:true},{'Set-Cookie':cookie('',0)});
    }
    if(route==='products'){
      const products=await db('market_products?shop_id=eq.'+shop.id+'&select=*&order=created_at.desc&limit=100');
      const files=await galleryFiles(shop);
      return response(200,{products:products.map(p=>withGallery(p,files))});
    }
    if(route==='inquiries'){
      const offset=Number(event.queryStringParameters?.offset||0);
      if(!Number.isSafeInteger(offset)||offset<0||offset>100000)fail(400,'Invalid inbox page.');
      const rows=await db('market_inquiries?shop_id=eq.'+shop.id+'&select=id,product_id,customer_name,customer_email,message,reference_image_path,status,created_at&order=created_at.desc&limit=51&offset='+offset);
      return response(200,{inquiries:rows.slice(0,50).map(row=>({...row,reference_url:row.reference_image_path?'/.netlify/functions/market-api?route=inquiry-reference&id='+row.id:null})),hasMore:rows.length>50});
    }
    if(route==='inquiry-status'){
      if(!UUID.test(body.id)||!['new','read','closed'].includes(body.status))fail(400,'Invalid inquiry update.');
      const rows=await db('market_inquiries?id=eq.'+body.id+'&shop_id=eq.'+shop.id,'PATCH',{status:body.status},{Prefer:'return=representation'});
      if(rows?.length!==1)fail(404,'Inquiry not found in your shop.');
      return response(200,{updated:true});
    }
    if(route==='inquiry-reference'){
      const id=event.queryStringParameters?.id;if(!UUID.test(id))fail(400,'Invalid inquiry.');
      const rows=await db('market_inquiries?id=eq.'+id+'&shop_id=eq.'+shop.id+'&select=reference_image_path&limit=1');
      const path=rows?.[0]?.reference_image_path;
      if(!path||!path.startsWith(shop.id+'/')||path.includes('..'))fail(404,'Reference picture not found in your shop.');
      const signed=await request('/storage/v1/object/sign/market-inquiry-references/'+path,'POST',{expiresIn:60});
      const location=new URL('/storage/v1'+signed.signedURL,configuration().origin);
      if(location.origin!==configuration().origin)fail(503,'Reference picture could not be opened.');
      return response(302,{}, {Location:location.href});
    }
    if(route==='product'){
      const product=productInput(body,shop.id);
      if(body.id){
        if(!UUID.test(body.id))fail(400,'Invalid product.');
        const rows=await db('market_products?id=eq.'+body.id+'&shop_id=eq.'+shop.id,'PATCH',product,{Prefer:'return=representation'});
        if(rows?.length!==1)fail(404,'Product not found in your shop.');
        return response(200,{product:withImage(rows[0])});
      }
      const existing=await db('market_products?shop_id=eq.'+shop.id+'&select=id&limit=100');
      if(existing.length>=100)fail(409,'This test shop supports up to 100 products.');
      const rows=await db('market_products','POST',{...product,shop_id:shop.id},{Prefer:'return=representation'});
      return response(201,{product:withImage(rows[0])});
    }
    if(route==='shop'){
      const name=typeof body.name==='string'?body.name.trim():'';
      const description=typeof body.description==='string'?body.description.trim():'';
      if(!name||name.length>120||description.length>2000)fail(400,'Check the shop name and description.');
      const rows=await db('market_shops?id=eq.'+shop.id+'&owner_wallet=eq.'+shop.owner_wallet,'PATCH',{name,description},{Prefer:'return=representation'});
      if(rows?.length!==1)fail(403,'The booth assignment changed. Sign in again.');
      return response(200,{shop:rows[0]});
    }
    if(route==='upload'){
      const {bytes,type,extension}=imageInput(body);
      const image_path=shop.id+'/'+randomUUID()+'.'+extension;
      await request('/storage/v1/object/market-product-images/'+image_path,'POST',bytes,{'Content-Type':type,'x-upsert':'false'});
      return response(201,{image_path});
    }
    fail(404,'Unknown merchant action.');
  }catch(error){return response(error.status||503,{error:error.status?error.message:'Merchant service is unavailable. Please try again.'});}
}
export function imageInput(body){
  if(!body||typeof body.data!=='string'||body.data.length>2800000||!/^[A-Za-z0-9+/]+={0,2}$/.test(body.data))fail(400,'Choose a valid image under 2 MB.');
  const bytes=Buffer.from(body.data,'base64');if(bytes.length>2097152||bytes.length<12)fail(400,'Choose an image under 2 MB.');
  const type=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'?'image/webp':null;
  if(!type||type!==body.type)fail(400,'Choose a JPG, PNG or WebP picture.');
  return {bytes,type,extension:{'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[type]};
}
export { request, db, configuration, requestOrigin, hash, fail, response, now, session };

