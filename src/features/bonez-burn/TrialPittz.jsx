import { useEffect, useState } from 'react';

const atlas = '/images/bonez-burn/left-thirty-six-v1.webp';

// Keep the original poses underneath until the complete atlas has decoded.
export default function TrialPittz({ trial }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!trial || ready) return;
    let active = true;
    const image = new Image();
    image.onload = async () => {
      try {
        await image.decode();
        if (active) setReady(true);
      } catch { /* The original animation remains visible if decoding fails. */ }
    };
    image.src = atlas;
    return () => { active = false; image.onload = null; };
  }, [trial, ready]);
  return <div className={`burn-worker burn-worker-left ${trial && ready ? 'pittz-trial-active' : ''}`} aria-hidden="true">
    {Array.from({ length: 12 }, (_, i) => <span className="burn-pose burn-smooth-pose" data-pose={i} key={i} style={{ '--pose': i, backgroundImage: `url(/images/bonez-burn/left-twelve-${i}.webp)` }} />)}
    <span className="pittz-trial-atlas" style={{ backgroundImage: `url(${atlas})` }} />
  </div>;
}
