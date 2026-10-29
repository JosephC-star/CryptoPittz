import {Address} from '@multiversx/sdk-core';
export function transferSpec(sender,recipient,identifier){
 for(const address of [sender,recipient]){const a=Address.newFromBech32(address);if(a.toBech32()!==address||a.isSmartContract()||a.getPublicKey().every(b=>b===0))throw Error('Use a valid personal ERD wallet address.');}
 if(sender===recipient)throw Error('Choose a different recipient wallet.');
 const match=/^(PITTZ-1a4c2d|PITTZVICE-c3ec94)-([a-f0-9]{1,16})$/.exec(identifier||'');
 if(!match||BigInt('0x'+match[2])===0n)throw Error('Choose an Original or Vice Pittz.');
 const hex=n=>{const h=n.toString(16);return h.padStart(Math.ceil(h.length/2)*2,'0');};
 const collection=Array.from(new TextEncoder().encode(match[1]),b=>hex(b)).join('');
 const destination=Array.from(Address.newFromBech32(recipient).getPublicKey(),b=>hex(b)).join('');
 return {sender,receiver:sender,value:'0',gasLimit:1000000,gasPrice:1000000000,chainID:'1',version:2,data:`ESDTNFTTransfer@${collection}@${hex(BigInt('0x'+match[2]))}@01@${destination}`};
}
