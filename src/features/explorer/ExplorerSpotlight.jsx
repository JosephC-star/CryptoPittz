import { useEffect, useState } from 'react';
import { loadRandomSpotlight } from '../dawg-pound/randomSpotlight.mjs';
import { getNftImage } from '../../utils/nftUtils';

export default function ExplorerSpotlight({ onSelect }) {
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

  return <div className="explorer-entrance-pack explorer-spotlight">
    {pittz.length ? pittz.map((nft, index) => <button type="button" key={nft.identifier} aria-label={'View ' + (nft.name || nft.identifier)} onClick={() => onSelect(nft, pittz)}>
      <img src={getNftImage(nft)} alt="" onError={event => { const fallback = '/images/pittz-' + ['01', '04', '08'][index] + '.jpg'; if (!event.currentTarget.src.endsWith(fallback)) event.currentTarget.src = fallback; }} />
    </button>) : ['01', '04', '08'].map(id => <span key={id} aria-hidden="true"><img src={'/images/pittz-' + id + '.jpg'} alt="" /></span>)}
  </div>;
}
