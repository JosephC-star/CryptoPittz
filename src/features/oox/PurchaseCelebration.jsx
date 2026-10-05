import { useEffect, useState } from 'react';
import { getNftImage } from '../../utils/nftUtils';
export default function PurchaseCelebration({ nft, hash }) {
  return <BurnCelebration key={`${nft.identifier}:${hash}`} nft={nft} hash={hash} />;
}
function BurnCelebration({ nft, hash }) {
  const [reveal, setReveal] = useState('covered');
  useEffect(() => {
    if (reveal !== 'burning') return;
    const timer = setTimeout(() => setReveal('revealed'), 3300);
    return () => clearTimeout(timer);
  }, [reveal]);
  const ignite = () => {
    setReveal(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'revealed' : 'burning');
  };
  return <div className="pitt-purchase-party" role="status">
    <p className="pitt-party-eyebrow">WELCOME TO YOUR PACK</p>
    <h3>You just bought…</h3>
    <div className="pitt-party-frame">
      <div className={`pitt-burn-art ${reveal}`}>
        <img src={getNftImage(nft)} alt={nft.name} />
        {reveal !== 'revealed' && <>
          <button className="pitt-burn-cover" onClick={ignite} disabled={reveal === 'burning'} aria-label={`Tap to reveal ${nft.name}`}>
            <span className="pitt-burn-motto">YOU EARN,<br />WE BURN</span>
            <span className="pitt-burn-prompt">Tap to reveal your Pittz</span>
          </button>
          {reveal === 'burning' && <div className="pitt-burn-edge" aria-hidden="true">
            {Array.from({length:15},(_,i) => <span className="pitt-flame" key={i} style={{'--f':i, '--height':`${28+(i*17)%45}px`}} />)}
          </div>}
        </>}
      </div>
    </div>
    {reveal !== 'revealed' && <button className="pitt-skip-reveal" onClick={() => setReveal('revealed')}>Skip reveal</button>}
    <h4>{nft.name}</h4><p>Purchase confirmed. This Pitt is in your wallet.</p>
    <a className="btn primary" href={`https://explorer.multiversx.com/transactions/${hash}`} target="_blank" rel="noopener noreferrer">View confirmed purchase ↗</a>
  </div>;
}
