// Read-only requests only: callers explicitly retry, never repeat a payment or mutation.
export async function readJson(url,{signal,timeoutMs=15000}={},fetcher=fetch){
 const controller=new AbortController();let timedOut=false;
 const cancel=()=>controller.abort();
 if(signal?.aborted)controller.abort();else signal?.addEventListener('abort',cancel,{once:true});
 const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
 try{
  const response=await fetcher(url,{method:'GET',cache:'no-store',signal:controller.signal});
  if(!response.ok)throw Object.assign(new Error('This information could not be loaded. Please try again.'),{status:response.status});
  return await response.json();
 }catch(error){if(timedOut)throw new Error('The request took too long. Please try again.');throw error;}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}
