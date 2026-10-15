import test from 'node:test';
import assert from 'node:assert/strict';
import { exportRevealVideo } from '../src/features/oox/exportRevealVideo.js';

async function withBrowser(run,{webm=false,hidden=false}={}){
 const names=['document','Image','HTMLCanvasElement','MediaRecorder','requestAnimationFrame','cancelAnimationFrame','performance'];
 const saved=names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]);
 const events=new Map(),canvases=[];let clock=0,stopped=0,recordingOptions;
 const ctx=new Proxy({}, {get(target,key){if(key in target)return target[key];if(key==='createLinearGradient'||key==='createRadialGradient')return ()=>({addColorStop(){}});return ()=>{};},set(target,key,value){target[key]=value;return true;}});
 class Canvas{getContext(){return ctx;}captureStream(fps){assert.equal(fps,30);return {getTracks:()=>[{stop(){stopped++;}}]};}}
 class ImageMock{set src(value){if(value)queueMicrotask(()=>this.onload?.());}}
 class Recorder{
  static isTypeSupported(type){return webm?type==='video/webm;codecs=vp9':type==='video/mp4';}
  constructor(stream,options){recordingOptions=options;this.mimeType=options.mimeType;this.state='inactive';}
  start(){this.state='recording';}
  stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable?.({data:new Blob(['recorded-frame'])});this.onstop?.();});}
 }
 const globals={document:{hidden,createElement(){const canvas=new Canvas();canvases.push(canvas);return canvas;},addEventListener(name,fn){events.set(name,fn);},removeEventListener(name){events.delete(name);}},Image:ImageMock,HTMLCanvasElement:Canvas,MediaRecorder:Recorder,performance:{now:()=>clock},requestAnimationFrame:fn=>setImmediate(()=>{clock+=100;fn(clock);}),cancelAnimationFrame:clearImmediate};
 for(const [name,value] of Object.entries(globals))Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});
 try{await run({canvases,events,get stopped(){return stopped;},get recordingOptions(){return recordingOptions;}});}finally{for(const [name,descriptor] of saved)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}
}
test('HD recording requests 768 × 1056 at 30fps and 8Mbps, then cleans up',async()=>withBrowser(async state=>{
 const progress=[];const result=await exportRevealVideo('https://example.test/art.png','Pittz',new AbortController().signal,p=>progress.push(p));
 assert.equal(result.extension,'mp4');assert.equal(result.blob.type,'video/mp4');assert.equal(state.canvases[0].width,768);assert.equal(state.canvases[0].height,1056);assert.equal(state.recordingOptions.videoBitsPerSecond,8000000);assert.equal(progress.at(-1),100);assert.equal(state.stopped,1);assert.equal(state.events.size,0);
}));
test('Browsers without MP4 recording get a correctly named WebM',async()=>withBrowser(async()=>{
 const result=await exportRevealVideo('https://example.test/art.png','Pittz',new AbortController().signal);assert.equal(result.extension,'webm');assert.match(result.blob.type,/^video\/webm/);
},{webm:true}));
test('Cancelled or hidden exports cannot return an incomplete video',async()=>withBrowser(async()=>{
 const controller=new AbortController();controller.abort();await assert.rejects(exportRevealVideo('https://example.test/art.png','Pittz',controller.signal),{name:'AbortError'});
 await assert.rejects(exportRevealVideo('https://example.test/art.png','Pittz',new AbortController().signal),/Keep this tab visible/);
},{hidden:true}));
