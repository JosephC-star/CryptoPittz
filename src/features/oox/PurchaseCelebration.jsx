import { getNftImage } from '../../utils/nftUtils';
export default function PurchaseCelebration({ nft, hash }) {
  return <div className="pitt-purchase-party" role="status">
    <div className="pitt-confetti" aria-hidden="true">{Array.from({length:36},(_,i)=><i key={i} style={{'--x':`${(i*37)%100}%`,'--delay':`${(i%9)*.13}s`,'--color':['#37e8db','#ff50d6','#ffe17e'][i%3],'--turn':`${i*29}deg`}} />)}</div>
    <p className="pitt-party-eyebrow">WELCOME TO YOUR PACK</p>
    <h3>You just bought…</h3>
    <div className="pitt-party-frame"><img src={getNftImage(nft)} alt={nft.name} /></div>
    <h4>{nft.name}</h4><p>Purchase confirmed. This Pitt is in your wallet.</p>
    <a className="btn primary" href={`https://explorer.multiversx.com/transactions/${hash}`} target="_blank" rel="noopener noreferrer">View confirmed purchase ↗</a>
  </div>;
}
