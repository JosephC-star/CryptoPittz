import test from 'node:test';
import assert from 'node:assert/strict';
import {youtubeVideoId} from '../shared/market-product-video.mjs';
import {productInput} from '../netlify/functions/market-api.mjs';
const id='M7lc1UVf-VE';
test('YouTube watch, share, Shorts, mobile and embed URLs select the video only',()=>{
 for(const url of [`https://www.youtube.com/watch?v=${id}&list=other`,`https://youtu.be/${id}?si=tracking`,`https://youtube.com/shorts/${id}`,`https://m.youtube.com/watch?v=${id}`,`https://www.youtube-nocookie.com/embed/${id}`,`https://youtube.com/live/${id}`])assert.equal(youtubeVideoId(url),id,url);
});
test('non-video links, iframe HTML and lookalike or credentialed hosts are rejected',()=>{
 for(const url of ['',null,{},`https://youtube.com.evil.test/watch?v=${id}`,`https://youtube.com@evil.test/watch?v=${id}`,`javascript:alert(1)`,`https://youtube.com/playlist?list=${id}`,`https://youtu.be/${id}/extra`,`https://youtube.com/watch?v=short`,`<iframe src="https://youtube.com/embed/${id}"></iframe>`,`https://user@youtube.com/watch?v=${id}`])assert.equal(youtubeVideoId(url),null,String(url));
});
test('product video saves canonical links, removes empty links and preserves omitted fields',()=>{
 const product={name:'Rug',quantity:1,made_to_order:false};
 assert.equal(productInput({...product,youtube_url:`https://youtu.be/${id}?si=tracking`},'shop').youtube_url,`https://www.youtube.com/watch?v=${id}`);
 assert.equal(productInput({...product,youtube_url:' '},'shop').youtube_url,null);
 assert.equal(productInput({...product,youtube_url:null},'shop').youtube_url,null);
 assert.equal(Object.hasOwn(productInput(product,'shop'),'youtube_url'),false);
 assert.throws(()=>productInput({...product,youtube_url:'https://evil.test/video'},'shop'),{status:400});
});
