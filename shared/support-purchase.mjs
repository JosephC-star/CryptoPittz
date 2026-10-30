export const BONEZ = 'BONEZ-ff9a73';
export const ROUTER = 'erd1qqqqqqqqqqqqqpgq360nakqgsp5zkmguptucpjy6n4n3du7e5snsd2swzq';
export function supportMessage({origin,booth,hash,address,visible}) {
 return ['The PittzStop — BONEZ purchase receipt','Origin: '+origin,'Booth: '+booth,'Transaction: '+hash,'Wallet: '+address,'Public supporter name and BONEZ total: '+(visible?'yes':'no'),'Record my confirmed BONEZ purchase. No payment is requested by this signature.'].join('\n');
}
export function verifiedPurchase(tx,hash,address) {
 if(!/^[a-f0-9]{64}$/.test(hash)||tx?.txHash!==hash||tx.sender!==address||tx.receiver!==ROUTER||tx.status!=='success'||tx.pendingResults)throw Error('This purchase is not fully confirmed yet. Try recording the receipt again shortly.');
 const data=Buffer.from(tx.data||'','base64').toString();
 // This room buys BONEZ using EGLD through the existing, guarded JEX route.
 if(!data.startsWith('aggregate@'+Buffer.from(BONEZ).toString('hex')+'@')||!/^\d+$/.test(tx.value)||BigInt(tx.value)<=0n)throw Error('This is not an EGLD-to-BONEZ purchase.');
 if(!Array.isArray(tx.operations))throw Error('Purchase transfer details are not indexed yet. Try again shortly.');
 const amount=tx.operations.filter(op=>op.action==='transfer'&&op.type==='esdt'&&op.identifier===BONEZ&&op.receiver===address&&op.sender!==address).reduce((sum,op)=>{if(!/^\d+$/.test(op.value))throw Error('Invalid transfer amount.');return sum+BigInt(op.value);},0n);
 if(amount<=0n)throw Error('No received BONEZ could be verified.');
 if(!Number.isSafeInteger(tx.timestamp)||tx.timestamp<=0||tx.timestamp*1000>Date.now()+60000)throw Error('Invalid purchase timestamp.');
 return {bonez_atomic:amount.toString(),egld_atomic:tx.value,purchased_at:new Date(tx.timestamp*1000).toISOString()};
}
