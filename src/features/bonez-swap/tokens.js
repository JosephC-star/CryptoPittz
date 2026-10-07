// Mainnet identifiers and decimals checked against MultiversX API and JEX's token feed.
export const TOKENS = Object.freeze([
 {id:'EGLD',symbol:'EGLD',name:'MultiversX',decimals:18},
 {id:'BONEZ-ff9a73',symbol:'BONEZ',name:'CryptoPittz BONEZ',decimals:6},
 {id:'WEGLD-bd4d79',symbol:'WEGLD',name:'Wrapped EGLD',decimals:18},
 {id:'MEX-455c57',symbol:'MEX',name:'xExchange',decimals:18},
 {id:'HTM-f51d55',symbol:'HTM',name:'Hatom',decimals:18},
 {id:'XOXNO-c1293a',symbol:'XOXNO',name:'XOXNO',decimals:18},
 {id:'ZPAY-247875',symbol:'ZPAY',name:'ZoidPay',decimals:18},
 {id:'ASH-a642d1',symbol:'ASH',name:'AshSwap',decimals:18},
 {id:'ITHEUM-df6f26',symbol:'ITHEUM',name:'Itheum',decimals:18},
 {id:'BOBER-9eb764',symbol:'BOBER',name:'Bober',decimals:18},
 {id:'RIDE-7d18e9',symbol:'RIDE',name:'holoride',decimals:18},
 {id:'ROAR-e5185d',symbol:'ROAR',name:'ROAR',decimals:10},
 {id:'HODL-b8bd81',symbol:'HODL',name:'HODL Token Club',decimals:8},
 {id:'REWARD-cf6eac',symbol:'REWARD',name:'Hodler Rewards',decimals:8},
].map(token=>Object.freeze(token)));
export function getToken(id){const token=TOKENS.find(t=>t.id===id);if(!token)throw Error('Choose a supported token.');return token;}
export function routingToken(id){getToken(id);return id==='EGLD'?'WEGLD-bd4d79':id;}
export function validatePair(input,output){
 getToken(input);getToken(output);
 if(input===output)throw Error('Choose two different tokens.');
 if(routingToken(input)===routingToken(output))throw Error('EGLD ↔ WEGLD uses wrap/unwrap. Use your wallet to wrap or unwrap EGLD.');
}
export function quoteParams(input,output,amount){
 validatePair(input,output);
 if(!/^\d{1,40}$/.test(amount)||BigInt(amount)<=0n)throw Error('Enter a positive amount.');
 // The live multi-hop AshSwap route failed simulation; the direct xExchange route passed.
 const directAsh=[input,output].includes('ASH-a642d1')&&[routingToken(input),routingToken(output)].includes('WEGLD-bd4d79');
 return new URLSearchParams({token_in:routingToken(input),token_out:routingToken(output),amount_in:amount,with_dyn_routing:'false',max_hops:directAsh?'1':'3'});
}
