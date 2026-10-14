import { useEffect, useRef, useState } from 'react';
import './VideoFurnace.css';
export default function VideoFurnace({ firing, celebration }) {
  const video = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    const element = video.current;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let wanted = !preference.matches;
    const start = () => { if (wanted && !document.hidden) element.play().catch(() => {}); };
    const change = () => { wanted = !preference.matches; if (wanted) start(); else element.pause(); };
    const visibility = () => { if (document.hidden) element.pause(); else start(); };
    const manual = () => { wanted = !element.paused; };
    element.addEventListener('play', manual);
    // User pause persists when returning to the tab; visibility pauses don't change intent.
    const intent = event => { wanted = event.detail; };
    element.addEventListener('motion-intent', intent);
    preference.addEventListener('change', change);
    document.addEventListener('visibilitychange', visibility);
    start();
    return () => { element.pause(); element.removeEventListener('play', manual); element.removeEventListener('motion-intent', intent); preference.removeEventListener('change', change); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  function toggle() {
    const element = video.current, want = element.paused;
    element.dispatchEvent(new CustomEvent('motion-intent', { detail: want }));
    if (want) element.play().catch(() => setError(true)); else element.pause();
  }
  return <div className={`burn-scene vf-scene vf-lit ${playing ? '' : 'vf-paused'} ${firing ? 'vf-overdrive' : ''}`}>
    <video ref={video} src="/experiments/pittensor-video-scene/loop.mp4" muted loop playsInline preload="metadata" aria-label="Two Pittz shoveling bones into the Pittensor furnace" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setError(true)} />
    <div className="vf-fx" aria-hidden="true"><i className="vf-light vf-magenta"/><i className="vf-light vf-green"/><i className="vf-light vf-violet"/><i className="vf-fire"/><i className="vf-gold"/><i className="vf-brass-rim"/><i className="vf-warm-floor"/><i className="vf-lamp vf-lamp-one"/><i className="vf-lamp vf-lamp-two"/>
      {Array.from({ length: 32 }, (_, i) => <i key={`e${i}`} className="vf-ember" style={{ '--x': i * 7 % 29, '--duration': `${3 + i % 4 * .8}s`, '--delay': `${-i * .53}s`, '--drift': `${(i % 5 - 2) * 17}px` }} />)}
      {Array.from({ length: 9 }, (_, i) => <i key={`s${i}`} className="vf-steam" style={{ '--left': `${i % 2 ? 73 : 15}%`, '--top': `${i % 2 ? 31 : 39}%`, '--delay': `${-i * 1.3}s` }} />)}
    </div>
    <button type="button" className="vf-toggle" onClick={toggle}>{playing ? 'Pause scene' : 'Play scene'}</button>
    <span className="vf-label" role={error ? 'status' : undefined}>{error ? 'Video unavailable. Contribution controls are still available below.' : firing ? celebration ? 'PILE CONTRIBUTION CONFIRMED · MONTHLY BURN PENDING' : 'FURNACE PREVIEW · NO TOKENS SPENT' : 'THE PACK’S INCINERATOR'}</span>
  </div>;
}
