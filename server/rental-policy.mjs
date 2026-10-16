import {RENTAL_TEST_POLICY,rentalTestAllowed} from '../shared/market-rental-test.mjs';
export const RENTAL_POLICY_VERSION='2026-10-15-v1';
export const RENTAL_TOKEN='BONEZ-ff9a73';
export const RENTAL_DECIMALS=6;
export const RENTAL_RECIPIENT='erd106gc0ksmtlrarpqrvjhyrv2rt9wawv4u3czx4w7xuj40s5sxpxjqyd94s9';
export const KEY_COLLECTION='CPMK-8d8a01';
export const PLANS=Object.freeze({1:60000n,6:330000n,12:600000n});
// These access flags are private backend records, never accepted from a client quote.
export function waived(shop){return !!shop && (shop.rental_fee_waived===true || shop.access_status==='test');}
export function priceFor(months,tier){
  if(![1,6,12].includes(months)||!['standard','meta','diamond','waived'].includes(tier))throw Error('Invalid rental plan.');
  const base=PLANS[months],amount=tier==='diamond'||tier==='waived'?0n:tier==='meta'?base/2n:base;
  return {months,tier,standardBonez:base.toString(),amountBonez:amount.toString(),amountAtomic:(amount*1000000n).toString(),discountPercent:tier==='standard'?0:tier==='meta'?50:100,token:RENTAL_TOKEN,decimals:RENTAL_DECIMALS,recipient:RENTAL_RECIPIENT,policyVersion:RENTAL_POLICY_VERSION};
}
export function reviewPrice(months,tier,policyVersion,address,origin){
  if(policyVersion===RENTAL_POLICY_VERSION)return priceFor(months,tier);
  if(policyVersion!==RENTAL_TEST_POLICY||!rentalTestAllowed(address,origin)||months!==1||tier!=='standard')throw Error('Rental test policy could not be verified.');
  return {...priceFor(1,'standard'),amountBonez:'1',amountAtomic:'1000000',discountPercent:0,policyVersion:RENTAL_TEST_POLICY,testPayment:true};
}
export function keyTypeFromChain(token,identifier,collection){
  if(!token||!/^CPMK-8d8a01-(?:[0-9a-f]{2})+$/.test(identifier)||typeof token.balance!=='string'||!/^\d+$/.test(token.balance)||BigInt(token.balance)===0n)return null;
  if(![KEY_COLLECTION,identifier].includes(token.tokenIdentifier)||typeof token.attributes!=='string')throw Error('Key token data could not be verified.');
  // Legacy gateway NFT records can have an empty type. Only corroborated
  // metadata for this exact collection may supply the missing type.
  const type=token.type===''&&collection?.collection===KEY_COLLECTION?collection.type:token.type;
  if(!['NonFungibleESDT','NonFungibleESDTv2'].includes(type))throw Error('The key must be a verified NFT.');
  const nonce=Number.parseInt(identifier.slice(KEY_COLLECTION.length+1),16);
  if(token.nonce!==undefined&&token.nonce!==nonce)throw Error('Key nonce did not match the verified token.');
  const raw=Buffer.from(token.attributes,'base64');
  if(raw.toString('base64')!==token.attributes)throw Error('Key attributes could not be decoded.');
  const types=raw.toString('utf8').split(';').filter(item=>item.startsWith('Type:')).map(item=>item.slice(5));
  if(types.length!==1)throw Error('Key tier is ambiguous.');
  return types[0]==='Diamond'?'diamond':types[0]==='Hodler'?'meta':null;
}
export function rentalSpec(address,quote){
  if(!/^erd1[0-9a-z]{58}$/.test(address)||address===RENTAL_RECIPIENT||quote.recipient!==RENTAL_RECIPIENT||quote.token!==RENTAL_TOKEN)throw Error('Rental payment destination could not be verified.');
  const expected=reviewPrice(quote.months,quote.tier,quote.policyVersion||RENTAL_POLICY_VERSION,address,quote.origin);
  if(expected.amountAtomic!==quote.amountAtomic||BigInt(expected.amountAtomic)<=0n)throw Error('This quote does not require a valid paid transfer.');
  let hex=BigInt(expected.amountAtomic).toString(16);if(hex.length%2)hex='0'+hex;
  return {sender:address,receiver:RENTAL_RECIPIENT,value:'0',data:'ESDTTransfer@424f4e455a2d666639613733@'+hex,gasLimit:500000,gasPrice:1000000000,chainID:'1',version:2};
}
export function verifyRentalReceipt(tx,quote,expectedHash){
  const spec=rentalSpec(quote.address,quote);
  if(!/^[a-f0-9]{64}$/.test(expectedHash)||tx?.txHash!==expectedHash||tx.status!=='success'||tx.pendingResults||(tx.chainID&&tx.chainID!=='1')||tx.sender!==spec.sender||tx.receiver!==spec.receiver||String(tx.value)!=='0'||tx.data!==Buffer.from(spec.data).toString('base64')||String(tx.nonce)!==String(quote.expectedNonce))throw Error('The rental payment receipt did not match the review.');
  if(!Number.isFinite(tx.timestamp)||tx.timestamp*1000<quote.createdAt-5000||tx.timestamp*1000>quote.expiresAt)throw Error('The payment timestamp did not match the rental review.');
  const events=tx.logs?.events||[];
  let amountHex=BigInt(quote.amountAtomic).toString(16);if(amountHex.length%2)amountHex='0'+amountHex;
  if(events.some(e=>e.identifier==='signalError')||!events.some(e=>e.identifier==='ESDTTransfer'&&e.address===quote.address&&e.topics?.[0]===Buffer.from(RENTAL_TOKEN).toString('base64')&&e.topics?.[1]===''&&e.topics?.[2]===Buffer.from(amountHex,'hex').toString('base64')&&e.topics?.[3]==='fpGH2htfx9GEA2SuQbFDWV3XMryOBGq7xuSq+FIGCaQ='))throw Error('The exact rental transfer to Pittensor was not confirmed.');
  return {txHash:expectedHash,amountAtomic:quote.amountAtomic,recipient:RENTAL_RECIPIENT};
}

