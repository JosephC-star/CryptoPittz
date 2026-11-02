import {youtubeVideoId,youtubeWatchUrl} from '../../../shared/market-product-video.mjs';
export default function ProductVideo({url,name='Product'}) {
 const id=youtubeVideoId(url);
 if(!id)return null;
 return <section className="ml-product-video" aria-label={name+' video'}><h3>See it in action</h3><iframe key={id} src={'https://www.youtube-nocookie.com/embed/'+id+'?playsinline=1'} title={name+' — product video'} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen/><a href={youtubeWatchUrl(id)} target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a></section>;
}
