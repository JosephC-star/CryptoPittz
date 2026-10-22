// sdk-dapp 5.7's tokenless login calls getAddress(), but its webview strategy
// leaves that method unimplemented. Use only the address from a completed login.
export function prepareWebviewLogin(provider){
 const strategy=provider.getProvider();
 const login=strategy.login.bind(strategy);
 let address='';
 strategy.login=async options=>{
  address='';
  const result=await login(options);
  if(result?.address)address=result.address;
  return result;
 };
 strategy.getAddress=async()=>{
  if(!address)throw Error('Wallet connection was cancelled. Please try again.');
  return address;
 };
 return provider;
}
