export const CONTRACT='erd1qqqqqqqqqqqqqpgql9z9vm8d599ya2r9seklpkcas6qmude4mvlsgrj7hv';
export const TOKEN='BONEZ-ff9a73';
export const POOL=49;
const unsigned=v=>{if(typeof v!=='string'||!/^\d{1,80}$/.test(v))throw Error('Invalid staking amount.');return BigInt(v);};
export function validateStaking(p){
 if(!p||p.address!==CONTRACT||p.poolId!==POOL||p.token!==TOKEN||typeof p.paused!=='boolean'||!Number.isSafeInteger(p.unbondEpochs)||p.unbondEpochs<0||p.unbondEpochs>100)throw Error('The BONEZ staking pool could not be verified.');
 unsigned(p.totalStaked);unsigned(p.rewardReserve);
 if(p.user){unsigned(p.user.staked);unsigned(p.user.rewards);if(!Number.isSafeInteger(p.user.pendingCount)||p.user.pendingCount<0)throw Error('Invalid withdrawal data.');}
 return p;
}
export function stakingSpec(address,action,amount='0'){
 if(!/^erd1[a-z0-9]{58}$/.test(address))throw Error('Connect your mainnet wallet.');
 let data;
 if(action==='stake'||action==='unstake'){
  const n=unsigned(amount);if(n<=0n)throw Error('Enter an amount greater than zero.');
  let hex=n.toString(16);if(hex.length%2)hex='0'+hex;
  data=action==='stake'?`ESDTTransfer@424f4e455a2d666639613733@${hex}@757365725374616b65@31`:`userUnstake@31@${hex}`;
 }else if(action==='claim')data='userClaim@31';
 else if(action==='withdraw')data='userUnbond@31';
 else throw Error('Unsupported staking action.');
 return {sender:address,receiver:CONTRACT,value:'0',data,gasLimit:20000000,gasPrice:1000000000,chainID:'1',version:2};
}
export function assertStakingAction(pool,balances,action,amount){
 validateStaking(pool);
 if(pool.paused)throw Error('OneDEX has paused this staking pool. Check again later.');
 if(!pool.user)throw Error('Connect your wallet to load its staking position.');
 if(action==='stake'&&(unsigned(balances.bonez)<unsigned(amount)||unsigned(amount)===0n))throw Error('Insufficient BONEZ balance.');
 if(action==='unstake'&&(unsigned(pool.user.staked)<unsigned(amount)||unsigned(amount)===0n))throw Error('Amount exceeds your staked BONEZ.');
 if(action==='claim'&&unsigned(pool.user.rewards)===0n)throw Error('There are no claimable rewards yet.');
 if(action==='withdraw'&&pool.user.pendingCount===0)throw Error('There are no pending withdrawals.');
}
