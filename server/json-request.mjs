function reject(status,message){throw Object.assign(new Error(message),{status});}
export function readJsonRequest(event,maxBytes=32768,largeMessage='This request is too large. Please shorten the text and try again.'){
  const raw=event.body??'';
  if(typeof raw!=='string')reject(400,'Invalid request body.');
  let bytes;
  if(event.isBase64Encoded===true){
    if(raw.length>Math.ceil(maxBytes/3)*4+4)reject(413,largeMessage);
    if(raw.length%4!==0||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(raw))reject(400,'Invalid request encoding.');
    bytes=Buffer.from(raw,'base64');
    if(bytes.toString('base64')!==raw)reject(400,'Invalid request encoding.');
  }else{
    if(Buffer.byteLength(raw)>maxBytes)reject(413,largeMessage);
    bytes=Buffer.from(raw);
  }
  if(bytes.length>maxBytes)reject(413,largeMessage);
  if(bytes.length===0)return {};
  let body;
  try{body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{reject(400,'Invalid JSON request.');}
  if(!body||Array.isArray(body)||typeof body!=='object')reject(400,'Invalid JSON request.');
  return body;
}
