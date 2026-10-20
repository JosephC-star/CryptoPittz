// A successful carrier transaction can still be waiting for cross-shard results.
export function transactionState(tx){
 if(!tx||typeof tx!=='object')return 'pending';
 if(['fail','invalid'].includes(tx.status))return 'failed';
 if(tx.status==='success'&&!tx.pendingResults)return 'confirmed';
 return 'pending';
}
