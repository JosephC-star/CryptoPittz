export const SUPPORT_USD_AMOUNTS=Object.freeze(Array.from({length:10},(_,index)=>(index+1)*10));
export function validSupportUsd(value){return Number.isInteger(value)&&SUPPORT_USD_AMOUNTS.includes(value);}
export function dollars(cents){
 if(cents===null||cents===undefined)return 'USD not recorded';
 const raw=BigInt(cents);const whole=(raw/100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');
 return '$'+whole+'.'+(raw%100n).toString().padStart(2,'0');
}
