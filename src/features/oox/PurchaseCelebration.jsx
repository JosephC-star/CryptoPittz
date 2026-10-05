import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getNftImage } from '../../utils/nftUtils';
export default function PurchaseCelebration({ nft, hash }) {
  return <BurnCelebration key={`${nft.identifier}:${hash}`} nft={nft} hash={hash} />;
}
function BurnCelebration({ nft, hash }) {
  const [reveal, setReveal] = useState('covered');
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (reveal !== 'burning') return;
    const timer = setTimeout(() => setReveal('revealed'), 4300);
    return () => clearTimeout(timer);
  }, [reveal]);
  const ignite = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    setReveal(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'revealed' : 'burning');
  };
  return <div className="pitt-purchase-party" role="status">
    {reveal === 'burning' && createPortal(<div className="pitt-flying-embers" style={{left:origin.x,top:origin.y}} aria-hidden="true">
      {Array.from({length:32},(_,i) => <i key={i} style={{'--dx':`${(i*83)%620-310}px`,'--dy':`${-100-(i*47)%430}px`,'--delay':`${(i%8)*.22}s`,'--size':`${2+i%3}px`}} />)}
    </div>, document.body)}
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
            {Array.from({length:24},(_,i) => <span className="pitt-flame" key={i} style={{'--f':i, '--angle':`${i*15}deg`, '--height':`${16+(i*17)%26}px`}} />)}
          </div>}
        </>}
      </div>
    </div>
    {reveal !== 'revealed' && <button className="pitt-skip-reveal" onClick={() => setReveal('revealed')}>Skip reveal</button>}
    <h4>{nft.name}</h4><p>Purchase confirmed. This Pitt is in your wallet.</p>
    <a className="btn primary" href={`https://explorer.multiversx.com/transactions/${hash}`} target="_blank" rel="noopener noreferrer">View confirmed purchase ↗</a>
  </div>;
}
