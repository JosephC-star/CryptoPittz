export function checkTransaction(tx, expected) {
  const p=tx.toSendable();
  for(const [key,value] of Object.entries(expected)) if(p[key]!==value) throw Error(`Transaction verification failed: ${key}.`);
  if(p.chainID!=='1'||p.gasPrice!==1000000000||p.version!==2||p.guardian||p.relayer||p.options) throw Error('Unsupported transaction configuration.');
  return p;
}
