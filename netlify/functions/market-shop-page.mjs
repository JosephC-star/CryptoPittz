import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {handler as marketApi,requestOrigin} from './market-api.mjs';
import {shopPageHtml} from '../../shared/shop-share.mjs';
export async function handler(event){
 const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 if(event.httpMethod!=='GET'&&event.httpMethod!=='HEAD')return {statusCode:405,headers,body:'GET required.'};
 try{
  const origin=requestOrigin(event),booth=Number(event.queryStringParameters?.booth);
  if(!Number.isSafeInteger(booth)||booth<1)return {statusCode:400,headers,body:'Choose a shop from the flea market.'};
  const result=await marketApi({...event,httpMethod:'GET',queryStringParameters:{route:'catalog',booth:String(booth)}});
  if(result.statusCode!==200)return {statusCode:result.statusCode,headers,body:'This storefront is unavailable. <a href="/flea-market/">Return to the market</a>.'};
  const {shop}=JSON.parse(result.body),html=await readFile(join(process.cwd(),'dist','index.html'),'utf8');
  return {statusCode:200,headers,body:event.httpMethod==='HEAD'?'':shopPageHtml(html,shop,origin)};
 }catch{return {statusCode:503,headers,body:'This storefront is temporarily unavailable. <a href="/flea-market/">Return to the market</a>.'};}
}
