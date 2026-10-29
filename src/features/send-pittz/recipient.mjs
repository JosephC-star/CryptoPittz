import {Address} from '@multiversx/sdk-core';
export function normalizeHerotag(value){
 const tag=value.trim().replace(/^@/,'').toLowerCase();
 const name=tag.endsWith('.elrond')?tag.slice(0,-7):tag;
 if(!/^[a-z0-9_-]{1,64}$/.test(name))throw Error('Enter an ERD address or a valid herotag, such as @yourname.');
 return name+'.elrond';
}
function wallet(address){const a=Address.newFromBech32(address);if(a.toBech32()!==address||a.isSmartContract()||a.getPublicKey().every(b=>b===0))throw Error('Recipient must be a personal ERD wallet.');return address;}
export async function resolveRecipient(input,read){
 const value=input.trim();if(value.startsWith('erd1'))return {address:wallet(value),herotag:null};
 const tag=normalizeHerotag(value);
 let resolved;try{resolved=await read('https://api.multiversx.com/usernames/'+encodeURIComponent(tag));}catch{throw Error('Herotag could not be found. Check its spelling or use the full ERD address.');}
 const address=wallet(resolved?.address);
 const account=await read('https://api.multiversx.com/accounts/'+address);
 if(account.address!==address||typeof account.username!=='string'||account.username.toLowerCase()!==tag)throw Error('Herotag ownership could not be verified. Use the recipient’s full ERD address.');
 return {address,herotag:tag};
}
