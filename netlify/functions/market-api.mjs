import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Address, Message, MessageComputer, UserVerifier } from '@multiversx/sdk-core';

const ORIGIN = 'https://deploy-preview-17--cryptopittz.netlify.app';
const COOKIE = '__Host-pittz-market';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hash = text => createHash('sha256').update(text).digest('hex');
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const now = () => new Date().toISOString();
export function wallet(value) {
  try { if (typeof value !== 'string' || !value.startsWith('erd1') || Address.newFromBech32(value).toBech32() !== value) throw Error(); return value; }
  catch { fail(400, 'A valid public erd1 wallet address is required.'); }
}
export function active(shop) {
  return !!shop && (shop.access_status === 'test' || (shop.access_status === 'active' && Date.parse(shop.rental_expires_at) > Date.now()));
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
  if (!active(shops?.[0])) fail(403, 'This wallet does not have an active assigned booth.');
  return shops[0];
}
function tokenFrom(event) {
  return (event.headers?.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
}
async function session(event) {
  const token = tokenFrom(event);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) fail(401, 'Sign in to your merchant backroom.');
  const sessions = await db('market_sessions?token_hash=eq.' + hash(ORIGIN + token) + '&revoked_at=is.null&expires_at=gt.' + encodeURIComponent(now()) + '&select=*&limit=1');
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
const withImage = p => ({ ...p, image_url: p.image_path ? imageRoute(p.id) : null });
export async function handler(event) {
  try {
    const actualOrigin = new URL(event.rawUrl || ORIGIN).origin;
    if (actualOrigin !== ORIGIN) fail(403, 'Merchant testing is available only on the approved preview.');
    const route = event.queryStringParameters?.route || 'me';
    const allowed = { me:'GET', catalog:'GET', image:'GET', products:'GET', challenge:'POST', verify:'POST', logout:'POST', product:'POST', upload:'POST', shop:'POST' };
    if (!allowed[route]) fail(404, 'Unknown merchant action.');
    if (event.httpMethod !== allowed[route]) fail(405, 'Unsupported request method.');
    if (event.httpMethod !== 'GET' && event.headers?.origin !== ORIGIN) fail(403, 'Open this action from the merchant preview.');
    if (event.isBase64Encoded || (event.body && Buffer.byteLength(event.body) > 2900000)) fail(413, 'The request is too large. Use an image under 2 MB.');
    if (event.httpMethod !== 'GET' && !event.headers?.['content-type']?.startsWith('application/json')) fail(415, 'JSON required.');
    let body = {}; try { if (event.body) body = JSON.parse(event.body); } catch { fail(400, 'Invalid request.'); }
    if (!body || Array.isArray(body) || typeof body !== 'object') fail(400, 'Invalid request.');

    if (route === 'challenge') {
      const address = wallet(body.address); await ownerShop(address);
      const recent = await db('market_login_challenges?wallet_address=eq.' + address + '&created_at=gt.' + encodeURIComponent(new Date(Date.now() - 60000).toISOString()) + '&select=id&limit=5');
      if (recent.length >= 5) fail(429, 'Wait a minute before requesting another login message.');
      const nonce = randomBytes(32).toString('hex');
      const challenge = { id:randomUUID(), wallet_address:address, nonce_hash:hash(nonce), origin:ORIGIN, expires_at:new Date(Date.now() + 300000).toISOString() };
      await db('market_login_challenges','POST',challenge);
      return response(200,{ id:challenge.id, nonce, message:loginMessage(challenge,nonce), expiresAt:challenge.expires_at });
    }
    if (route === 'verify') {
      if (!UUID.test(body.id) || !/^[0-9a-f]{64}$/.test(body.nonce)) fail(400, 'Invalid login challenge.');
      const rows = await db('market_login_challenges?id=eq.' + body.id + '&used_at=is.null&expires_at=gt.' + encodeURIComponent(now()) + '&select=*&limit=1');
      const challenge = rows?.[0];
      if (!challenge || challenge.origin !== ORIGIN || challenge.nonce_hash !== hash(body.nonce)) fail(401, 'Login message expired or was already used.');
      if (!await validSignature(challenge.wallet_address, loginMessage(challenge,body.nonce), body.signature)) fail(401, 'The wallet signature could not be verified.');
      const shop = await ownerShop(challenge.wallet_address);
      const consumed = await db('market_login_challenges?id=eq.' + body.id + '&used_at=is.null&expires_at=gt.' + encodeURIComponent(now()) + '&select=id', 'PATCH', { used_at:now() }, { Prefer:'return=representation' });
      if (consumed?.length !== 1) fail(401, 'This login message has already been used.');
      const token = randomBytes(32).toString('hex');
      await db('market_sessions','POST',{shop_id:shop.id,wallet_address:challenge.wallet_address,token_hash:hash(ORIGIN+token),expires_at:new Date(Date.now()+7200000).toISOString()});
      return response(200,{ shop },{'Set-Cookie':cookie(token)});
    }
    if (route === 'catalog') {
      const booth = Number(event.queryStringParameters?.booth || 1);
      if (!Number.isSafeInteger(booth) || booth < 1) fail(400,'Invalid booth.');
      const shops = await db('market_shops?booth_number=eq.'+booth+'&select=id,booth_number,name,description,access_status,rental_expires_at&limit=1');
      const shop = shops?.[0]; if (!active(shop)) fail(404,'This storefront is not available.');
      const products = await db('market_products?shop_id=eq.'+shop.id+'&status=eq.published&select=id,name,description,price,currency,quantity,made_to_order,delivery,image_path&order=created_at.desc&limit=100');
      return response(200,{shop:{id:shop.id,name:shop.name,description:shop.description,booth_number:shop.booth_number},products:products.map(withImage)});
    }
    if (route === 'image') {
      const id=event.queryStringParameters?.product;if(!UUID.test(id))fail(400,'Invalid product.');
      const rows=await db('market_products?id=eq.'+id+'&select=id,shop_id,status,image_path&limit=1');const product=rows?.[0];
      if(!product?.image_path)fail(404,'Image not found.');
      if(product.status==='published'){
        const shops=await db('market_shops?id=eq.'+product.shop_id+'&select=access_status,rental_expires_at&limit=1');
        if(!active(shops?.[0]))fail(404,'Image not available.');
      }else{const auth=await session(event);if(auth.shop.id!==product.shop_id)fail(404,'Image not available.');}
      if(!product.image_path.startsWith(product.shop_id+'/')||product.image_path.includes('..'))fail(404,'Image not available.');
      const signed=await request('/storage/v1/object/sign/market-product-images/'+product.image_path,'POST',{expiresIn:60});
      const location=new URL('/storage/v1'+signed.signedURL,configuration().origin);
      if(location.origin!==configuration().origin)fail(503,'Image could not be opened.');
      return response(302,{}, {Location:location.href});
    }

    const auth=await session(event),shop=auth.shop;
    if(route==='me')return response(200,{shop});
    if(route==='logout'){
      await db('market_sessions?id=eq.'+auth.current.id,'PATCH',{revoked_at:now()});
      return response(200,{signedOut:true},{'Set-Cookie':cookie('',0)});
    }
    if(route==='products'){
      const products=await db('market_products?shop_id=eq.'+shop.id+'&select=*&order=created_at.desc&limit=100');
      return response(200,{products:products.map(withImage)});
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
      if(typeof body.data!=='string'||body.data.length>2800000||!/^[A-Za-z0-9+/]+={0,2}$/.test(body.data))fail(400,'Choose a valid image under 2 MB.');
      const bytes=Buffer.from(body.data,'base64');if(bytes.length>2097152||bytes.length<12)fail(400,'Choose an image under 2 MB.');
      const type=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'?'image/webp':null;
      if(!type||type!==body.type)fail(400,'Choose a JPG, PNG or WebP picture.');
      const extension={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[type];
      const image_path=shop.id+'/'+randomUUID()+'.'+extension;
      await request('/storage/v1/object/market-product-images/'+image_path,'POST',bytes,{'Content-Type':type,'x-upsert':'false'});
      return response(201,{image_path});
    }
    fail(404,'Unknown merchant action.');
  }catch(error){return response(error.status||503,{error:error.status?error.message:'Merchant service is unavailable. Please try again.'});}
}
