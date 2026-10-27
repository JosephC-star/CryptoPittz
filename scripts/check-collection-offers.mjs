// Read-only contract query and unsigned simulation. Never signs or broadcasts.
import {readFileSync,writeFileSync} from 'node:fs';
import {collectionOfferSpec} from '../src/features/oox/collectionOfferValidation.mjs';
import {assertOfferSimulation,OFFER_CONTRACT,OFFER_CODE_HASH} from '../src/features/oox/offerValidation.mjs';
import {decodeCollectionOffer} from '../src/features/oox/offerCodec.mjs';
async function get(url,options){const r=await fetch(url,{...options,signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
const account=await get('https://api.multiversx.com/accounts/'+OFFER_CONTRACT);if(account.codeHash!==OFFER_CODE_HASH)throw Error('Contract changed');
const rows=await get('https://gateway.multiversx.com/vm-values/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scAddress:OFFER_CONTRACT,funcName:'getAllGlobalOffers',args:[]})});
if(rows.data?.data?.returnCode!=='ok')throw Error('Query failed');
const encoded=rows.data.data.returnData;const offers=encoded.map(x=>decodeCollectionOffer(x));console.log('Decoded',offers.length,'global offers');
const fixture=JSON.parse(readFileSync(new URL('../tests/fixtures/oox-offer-review.json',import.meta.url)));
const review={scope:'collection',action:'offer',collection:'PITTZ-1a4c2d',address:fixture.address,amount:'1000000000000',deadline:Math.floor(Date.now()/1000)+86400};
const sender=await get('https://api.multiversx.com/accounts/'+review.address);const spec=collectionOfferSpec(review);
const simulation=await get('https://api.multiversx.com/transaction/simulate?checkSignature=false',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...spec,nonce:sender.nonce,data:Buffer.from(spec.data).toString('base64'),signature:'0'.repeat(128)})});
assertOfferSimulation(simulation,review);
writeFileSync(new URL('../tests/fixtures/oox-collection-offer-simulation.json',import.meta.url),JSON.stringify({review,simulation})+'\n');
const index=offers.findIndex(o=>o.collection==='PITTZ-1a4c2d');writeFileSync(new URL('../tests/fixtures/oox-collection-offer-codec.json',import.meta.url),JSON.stringify({encoded:encoded[index],offer:offers[index]})+'\n');
console.log('Unsigned creation simulation passed; no transaction broadcast.');
