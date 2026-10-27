import {Buffer} from 'buffer';
import {Address} from '@multiversx/sdk-core';
export const XOXNO_CONTRACT='erd1qqqqqqqqqqqqqpgq6wegs2xkypfpync8mn2sa5cmpqjlvrhwz5nqgepyg8';
export const XOXNO_HASH='J8oqTiLt86rehFG/pwzpd3sqL5McIhqNYnAQ6mvLZgg=';
const ah=a=>Buffer.from(Address.newFromBech32(a).getPublicKey()).toString('hex');
const hex=n=>{let h=BigInt(n).toString(16);return h.padStart(Math.ceil(h.length/2)*2,'0');};
const txh=t=>Buffer.from(t).toString('hex');
export function decodeXoxnoOffer(encoded){
 const bytes=Buffer.from(encoded,'base64');let at=0;
 const take=n=>{if(n<0||at+n>bytes.length)throw Error('Incomplete XOXNO offer.');const b=bytes.subarray(at,at+n);at+=n;return b;};
 const uint=n=>{const b=take(n);return b.length?BigInt('0x'+b.toString('hex')):0n;};
 const buf=()=>{const n=Number(uint(4));if(n>8192)throw Error('Oversized XOXNO field.');return take(n);};
 const big=()=>{const b=buf();return b.length?BigInt('0x'+b.toString('hex')).toString():'0';};
 const id=uint(8).toString(),collection=buf().toString(),quantity=big(),currency=buf().toString(),paymentNonce=uint(8).toString(),amount=big(),timestamp=uint(8).toString(),buyer=Address.newFromHex(take(32).toString('hex')).toBech32();
 let attributes=null,newVersion=false;if(at<bytes.length){const opt=Number(uint(1));if(opt===1)attributes=buf().toString('hex');else if(opt!==0)throw Error('Invalid XOXNO traits.');}if(at<bytes.length){const v=Number(uint(1));if(v>1)throw Error('Invalid XOXNO offer version.');newVersion=v===1;}if(at!==bytes.length)throw Error('Unexpected XOXNO offer data.');
 return {id,collection,quantity,currency,paymentNonce,amount,timestamp,buyer,attributes,newVersion};
}
export function xoxnoAcceptanceSpec(r){
 const o=r.chainOffer,n=r.nft;if(r.scope!=='xoxno'||r.action!=='accept'||!o||!['PITTZ-1a4c2d','PITTZVICE-c3ec94'].includes(o.collection)||n?.collection!==o.collection||!new RegExp('^'+o.collection+'-[a-f0-9]{1,16}$').test(n.identifier||'')||o.currency!=='EGLD'||o.paymentNonce!=='0'||BigInt(o.quantity)<1n||BigInt(o.amount)<=0n||o.buyer===r.address)throw Error('This XOXNO offer cannot be accepted.');
 const nonce=BigInt('0x'+n.identifier.split('-').at(-1));if(!nonce)throw Error('Invalid NFT.');ah(o.buyer);if(ah(r.address).startsWith('0000000000000000'))throw Error('Use a wallet account.');
 let args=hex(o.id);
 if(o.attributes!==null){if(!/^[a-f0-9]{128}$/i.test(r.authorization?.signature||''))throw Error('XOXNO trait authorization required.');const expected=ah(r.address)+txh(o.collection)+txh(nonce.toString())+txh(o.id)+o.attributes;if(r.authorization.data?.toLowerCase()!==expected.toLowerCase())throw Error('XOXNO authorization does not match this sale.');args+='@@'+r.authorization.signature;}
 return {sender:r.address,receiver:r.address,value:'0',data:`ESDTNFTTransfer@${txh(o.collection)}@${hex(nonce)}@01@${ah(XOXNO_CONTRACT)}@${txh('acceptGlobalOffer')}@${args}`,gasLimit:100000000,gasPrice:1000000000,chainID:'1',version:2};
}
export async function readXoxnoOffer(id){
 if(!/^[1-9]\d*$/.test(String(id))||BigInt(id)>0xffffffffffffffffn)throw Error('Invalid XOXNO offer.');
 const r=await fetch('https://gateway.multiversx.com/vm-values/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scAddress:XOXNO_CONTRACT,funcName:'getGlobalOffer',args:[hex(id)]}),signal:AbortSignal.timeout(15000)});const d=await r.json();if(!r.ok||d.code!=='successful'||d.data?.data?.returnCode!=='ok'||d.data.data.returnData?.length!==1||!d.data.data.returnData[0])throw Error('XOXNO offer is no longer available.');const encoded=d.data.data.returnData[0],offer=decodeXoxnoOffer(encoded);if(offer.id!==String(id))throw Error('XOXNO offer mismatch.');return {offer,encoded};
}
export async function verifyXoxnoAcceptance(r){
 const c=await fetch('https://api.multiversx.com/accounts/'+XOXNO_CONTRACT,{signal:AbortSignal.timeout(15000)});const contract=await c.json();if(!c.ok||contract.codeHash!==XOXNO_HASH)throw Error('XOXNO contract changed. Acceptance paused.');const current=await readXoxnoOffer(r.chainOffer.id);if(current.encoded!==r.chainEncoded)throw Error('XOXNO offer changed. Review again.');
 const n=await fetch('https://api.multiversx.com/accounts/'+r.address+'/nfts/'+r.nft.identifier,{signal:AbortSignal.timeout(15000)});const owned=await n.json();if(!n.ok||owned.identifier!==r.nft.identifier||owned.collection!==r.nft.collection||owned.type!=='NonFungibleESDT'||owned.balance&&owned.balance!=='1')throw Error('This wallet no longer holds the Pittz.');
 xoxnoAcceptanceSpec(r);
}
export function assertXoxnoAcceptanceEvents(events,r){
 if(events.some(e=>e.identifier==='signalError'))throw Error('XOXNO sale failed.');
 const name=Buffer.from('accept_global_offer').toString('base64');const raw=events.find(e=>e.address===XOXNO_CONTRACT&&(e.identifier==='accept_global_offer'||e.identifier==='acceptGlobalOffer'&&e.topics?.[0]===name));const t=raw?.identifier==='acceptGlobalOffer'?raw.topics.slice(1):raw?.topics;
 if(!raw)throw Error('The network simulation did not confirm XOXNO settlement. Acceptance is paused for this wallet; nothing was submitted.');
 const o=r.chainOffer,n=BigInt('0x'+r.nft.identifier.split('-').at(-1));const token=Buffer.from(o.collection),amount=Buffer.from([1]),len=Buffer.alloc(4);len.writeUInt32BE(token.length);const nonce=Buffer.alloc(8);nonce.writeBigUInt64BE(n);const size=Buffer.alloc(4);size.writeUInt32BE(1);const nft=Buffer.concat([len,token,nonce,size,amount]).toString('base64');
 if(!t||t[0]!==r.chainEncoded||t[1]!==Buffer.from(ah(r.address),'hex').toString('base64')||t[2]!==nft||t[3]!=='AQ=='||t[4]!=='')throw Error('XOXNO settlement does not match the reviewed sale.');return raw;
}
