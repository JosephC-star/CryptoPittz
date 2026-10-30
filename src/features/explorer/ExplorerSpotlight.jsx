import { useEffect, useState } from 'react';
import { loadRandomSpotlight } from '../dawg-pound/randomSpotlight.mjs';
import { getNftImage } from '../../utils/nftUtils';

export default function ExplorerSpotlight() {
  const [pittz, setPittz] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const [original, vice] = await Promise.all([
          loadRandomSpotlight('PITTZ-1a4c2d', { signal: controller.signal }),
          loadRandomSpotlight('PITTZVICE-c3ec94', { signal: controller.signal }),
        ]);
        // Each collection gets a place; the third place alternates at random.
        const picks = [original[0], vice[0], Math.random() < 0.5 ? original[1] : vice[1]].filter(Boolean);
        for (let i = picks.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [picks[i], picks[j]] = [picks[j], picks[i]];
        }
        if (!controller.signal.aborted) setPittz(picks);
      } catch {
        // Keep the local artwork if the collection API is temporarily unavailable.
      }
    }
    load();
    return () => controller.abort();
  }, []);

  return <div className="explorer-entrance-pack" aria-hidden="true">
    {pittz.length ? pittz.map((nft, index) => <img key={nft.identifier} src={getNftImage(nft)} alt="" onError={event => { const fallback = '/images/pittz-' + ['01', '04', '08'][index] + '.jpg'; if (!event.currentTarget.src.endsWith(fallback)) event.currentTarget.src = fallback; }} />)
      : ['01', '04', '08'].map(id => <img key={id} src={'/images/pittz-' + id + '.jpg'} alt="" />)}
  </div>;
}
