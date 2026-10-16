import {session,requestOrigin,response,fail} from './market-api.mjs';
import {quoteRental} from '../../server/rental-keys.mjs';
export async function handler(event){try{
  requestOrigin(event);
  if(event.httpMethod!=='GET')fail(405,'Rental payment submission is not enabled.');
  const months=Number(event.queryStringParameters?.months||1);
  if(![1,6,12].includes(months))fail(400,'Choose one, six, or twelve months.');
  const {shop}=await session(event);
  const quote=await quoteRental(shop,months);
  return response(200,{quote});
}catch(error){return response(error.status||503,{error:error.status?error.message:'Rental benefit verification is unavailable. No payment is being requested.'});}}
