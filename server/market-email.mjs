export function emailAddress(value){
 const email=typeof value==='string'?value.trim().toLowerCase():'';
 if(email.length>320||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||/[\r\n<>]/.test(email))throw Error('Enter a valid email address.');
 return email;
}
export function mailReady(){return process.env.MARKET_EMAIL_ALERTS_ENABLED==='true'&&!!process.env.RESEND_API_KEY&&!!process.env.MARKET_EMAIL_FROM;}
function mailError(message){return Object.assign(new Error(message),{status:502});}
export async function sendMarketMail(to,subject,text,idempotencyKey){
 if(!mailReady())throw mailError('Email alerts are not configured yet.');
 const from=process.env.MARKET_EMAIL_FROM.trim(),key=process.env.RESEND_API_KEY.trim();
 if(/[\r\n]/.test(from))throw mailError('The email sender setting contains a line break. Check MARKET_EMAIL_FROM in Netlify.');
 if(!key.startsWith('re_')||/\s/.test(key))throw mailError('The Resend API key setting is not a valid key format. Check RESEND_API_KEY in Netlify; use the key value beginning with re_.');
 const recipient=emailAddress(to);
 let response;
 try{response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':idempotencyKey},body:JSON.stringify({from,to:[recipient],subject,text}),redirect:'error',signal:AbortSignal.timeout(7000)});}
 catch{throw mailError('The site could not reach Resend. Please retry shortly.');}
 if(!response.ok){
  const details=await response.json().catch(()=>({}));
  if(response.status===401)throw mailError('Resend rejected the API key. Check that RESEND_API_KEY is current and belongs to the account with your verified domain.');
  if(response.status===403)throw mailError('Resend denied this send. Check that the API key has sending permission for the verified sender domain.');
  if(details.name==='validation_error'||response.status===422)throw mailError('Resend rejected the email settings. Check MARKET_EMAIL_FROM and confirm its domain is verified in the same Resend account.');
  if(response.status===429)throw mailError('The email service could not send this message because its sending limit was reached. Please wait before retrying.');
  throw mailError('The email service could not send this message (HTTP '+response.status+'). Check Resend for sending restrictions.');
 }
 const result=await response.json().catch(()=>null);if(!result||typeof result.id!=='string')throw mailError('Email acceptance could not be confirmed.');
 return result.id;
}
