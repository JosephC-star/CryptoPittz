export function emailAddress(value){
 const email=typeof value==='string'?value.trim().toLowerCase():'';
 if(email.length>320||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||/[\r\n<>]/.test(email))throw Error('Enter a valid email address.');
 return email;
}
export function mailReady(){return process.env.MARKET_EMAIL_ALERTS_ENABLED==='true'&&!!process.env.RESEND_API_KEY&&!!process.env.MARKET_EMAIL_FROM;}
export async function sendMarketMail(to,subject,text,idempotencyKey){
 if(!mailReady())throw Error('Email alerts are not configured yet.');
 const from=process.env.MARKET_EMAIL_FROM;
 if(/[\r\n]/.test(from))throw Error('Email sender needs attention.');
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':idempotencyKey},body:JSON.stringify({from,to:[emailAddress(to)],subject,text}),redirect:'error',signal:AbortSignal.timeout(7000)});
 if(!response.ok)throw Error('The email service could not send this message.');
 const result=await response.json();if(typeof result.id!=='string')throw Error('Email acceptance could not be confirmed.');
 return result.id;
}
