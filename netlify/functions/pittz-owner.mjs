import {Address,Abi,BinaryCodec} from '@multiversx/sdk-core';
import ooxAbi from '../../src/features/collectors/oox-owner-abi.json' with {type:'json'};
const ooxCodec=new BinaryCodec(),ooxDefinition=Abi.create(ooxAbi);
const OOX='erd1qqqqqqqqqqqqqpgqwp73w2a9eyzs64eltupuz3y3hv798vlv899qrjnflg';
function auction(encoded,custodian){if(custodian!==OOX)return decodeAuction(Buffer.from(encoded,'base64'));const bytes=Buffer.from(encoded,'base64'),v=ooxCodec.decodeTopLevel(bytes,ooxDefinition.getStruct('Auction'));if(!Buffer.from(ooxCodec.encodeTopLevel(v)).equals(bytes))throw Error('Incomplete auction.');const a=v.valueOf();return {collection:a.auctioned_tokens.token_identifier,nonce:BigInt(a.auctioned_tokens.token_nonce.toString()),quantity:BigInt(a.auctioned_tokens.amount.toString()),sellerHex:Buffer.from(a.original_owner.getPublicKey()).toString('hex')};}
import {decodeAuction} from '../../src/features/xoxno/validation.js';
const XOXNO='erd1qqqqqqqqqqqqqpgq6wegs2xkypfpync8mn2sa5cmpqjlvrhwz5nqgepyg8';
const valid=a=>{try{return Address.newFromBech32(a).toBech32()===a;}catch{return false;}};
const contract=a=>Address.newFromBech32(a).isSmartContract();
async function json(url,body){const r=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{method:'POST',body:JSON.stringify(body)}:{})});if(!r.ok)throw Error('Owner lookup unavailable.');return r.json();}
export async function handler(event){
 const reply=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)});
 if(event.httpMethod!=='GET')return reply(405,{error:'GET only.'});
 const {identifier,address:requested}=event.queryStringParameters||{};
 if(identifier?!/^(PITTZ-1a4c2d|PITTZVICE-c3ec94)-[a-f0-9]{1,16}$/i.test(identifier):!valid(requested))return reply(400,{error:'Invalid Pittz or wallet.'});
 try{
 let address=requested,role='owner',custodian=null;
 if(identifier){const nft=await json('https://api.multiversx.com/nfts/'+identifier+'?withOwner=true');if(nft.identifier!==identifier||!valid(nft.owner))throw Error('Ownership could not be verified.');address=nft.owner;
 if(contract(address)){custodian=address;role='custody';
 // Only resolve a seller when the live escrow contract and exact auction agree.
 if(address===XOXNO||address===OOX){try{const item=await json('https://api.xoxno.com/nft/'+identifier);const sale=item.saleInfo;if(item.identifier===identifier&&sale?.marketplace===(address===XOXNO?'xoxno':'oox')&&Number.isSafeInteger(sale.auctionId)&&sale.auctionId>0){let h=BigInt(sale.auctionId).toString(16);h=h.padStart(Math.ceil(h.length/2)*2,'0');const q=await json('https://gateway.multiversx.com/vm-values/query',{scAddress:address,funcName:'getFullAuctionData',args:[h]});if(q.code==='successful'&&q.data?.data?.returnCode==='ok'&&q.data.data.returnData?.length===1){const a=auction(q.data.data.returnData[0],address);if(a.collection===nft.collection&&a.nonce===BigInt('0x'+identifier.split('-').at(-1))&&a.quantity===1n){const seller=Address.newFromHex(a.sellerHex).toBech32();if(valid(seller)&&!contract(seller)){address=seller;role='seller';}}}}}catch{/* Keep custody label; never guess the owner. */}}
 }}
 if(role==='custody')return reply(200,{address,role,custodian,name:null,avatar:null});
 const account=await json('https://api.multiversx.com/accounts/'+address);if(account.address!==address)throw Error('Wallet response mismatch.');
 let name=typeof account.username==='string'?account.username.slice(0,100):null,avatar=null;
 try{const p=await json('https://api.xoxno.com/user/'+address+'/profile');if(p.address===address||p.owner===address){if(typeof p.username==='string'&&p.username)name=p.username.slice(0,100);if(typeof p.profile==='string'&&p.profile.startsWith('https://')&&p.profile.length<=2048)avatar=p.profile;}}catch{/* Public names are optional. */}
 return reply(200,{address,role,custodian,name,avatar});
 }catch{return reply(502,{error:'Owner information could not load. Try again.'});}
}
