// A cached address alone does not prove that the current wallet can sign.
export async function signingProvider({address,embedded,current,connect}){
 if(!address)throw Error('Connect the wallet holding your key first.');
 if(embedded){
  const result=await connect();
  if(result?.address!==address)throw Error('The wallet changed. Connect and verify the wallet holding your key again.');
 }
 const provider=current();
 if(!provider.isInitialized())throw Error('Your wallet connection expired. Reconnect your wallet and try again.');
 return provider;
}
export async function waitForApproval(work,cancel,{timeoutMs=90000}={}){
 let timer;
 try{return await Promise.race([work(),new Promise((_,reject)=>{
  timer=setTimeout(()=>{
   reject(Error('Wallet approval timed out. Stay on this page in xPortal and try again, or reconnect from Chrome/Safari. No payment was taken.'));
   try{Promise.resolve(cancel?.()).catch(()=>{});}catch{}
  },timeoutMs);
 })]);}finally{clearTimeout(timer);}
}
