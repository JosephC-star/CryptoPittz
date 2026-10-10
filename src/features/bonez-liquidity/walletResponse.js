// A late wallet response must never resume a deposit after the UI times out.
export async function waitForWallet(sign,{timeoutMs=120000,onTimeout}={}){
 let timer;
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{
  Promise.resolve().then(()=>onTimeout?.()).catch(()=>{});
  reject(Error('xPortal did not return the signed transaction to this page. This request was not submitted. Reconnect your wallet, then review the deposit again.'));
 },timeoutMs);});
 try{return await Promise.race([Promise.resolve().then(sign),deadline]);}
 finally{clearTimeout(timer);}
}
