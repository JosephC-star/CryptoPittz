import { createRevealScene } from './exportRevealGif.js';

export async function exportRevealVideo(imageUrl,name,signal,onProgress=()=>{},identifier){
  if(typeof MediaRecorder==='undefined'||typeof HTMLCanvasElement.prototype.captureStream!=='function')throw Error('HD video export is unavailable in this browser. Try the high-quality GIF instead.');
  const mimeType=['video/mp4;codecs=avc1.424028','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));
  if(!mimeType)throw Error('HD video export is unavailable in this browser. Try the high-quality GIF instead.');
  const {canvas,draw}=await createRevealScene(imageUrl,name,signal,identifier,3);
  if(signal.aborted)throw new DOMException('Cancelled','AbortError');
  if(document.hidden)throw Error('Keep this tab visible while the HD video is created.');
  draw(0);
  const stream=canvas.captureStream(30);
  let recorder;
  try{recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:8000000});}
  catch(error){stream.getTracks().forEach(track=>track.stop());throw error;}
  return new Promise((resolve,reject)=>{
    const chunks=[];let raf,failure,timeout,finished=false;
    const cleanup=()=>{cancelAnimationFrame(raf);clearTimeout(timeout);signal.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',hidden);stream.getTracks().forEach(track=>track.stop());};
    const stop=error=>{failure=error;cancelAnimationFrame(raf);if(recorder.state!=='inactive')recorder.stop();else finish();};
    const finish=()=>{if(finished)return;finished=true;cleanup();if(failure)reject(failure);else if(!chunks.length)reject(Error('No video frames were recorded. Try the GIF download.'));else{onProgress(100);const type=recorder.mimeType||mimeType;resolve({blob:new Blob(chunks,{type}),extension:type.startsWith('video/mp4')?'mp4':'webm'});}};
    const abort=()=>stop(new DOMException('Cancelled','AbortError'));
    const hidden=()=>{if(document.hidden)stop(Error('Video export paused because the tab was hidden. Keep it visible and try again.'));};
    recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
    recorder.onstop=finish;
    recorder.onerror=()=>stop(Error('The browser could not record this reveal. Try the GIF download.'));
    signal.addEventListener('abort',abort,{once:true});document.addEventListener('visibilitychange',hidden);
    timeout=setTimeout(()=>stop(Error('Video export timed out. Keep the tab visible and try again.')),20000);
    try{
      recorder.start(250);const start=performance.now();
      const frame=now=>{if(signal.aborted){abort();return;}const elapsed=Math.min(now-start,6800);draw(elapsed);onProgress(Math.min(99,Math.round(elapsed/6800*100)));if(elapsed<6800)raf=requestAnimationFrame(frame);else stop();};
      raf=requestAnimationFrame(frame);
    }catch(error){failure=error;finish();}
  });
}
