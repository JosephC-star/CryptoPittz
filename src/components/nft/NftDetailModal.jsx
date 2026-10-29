import rarity from '../../data/trait-rarity.json';
import {rarestTraits} from '../../utils/traitRarity.mjs';
import {getBonezGeneration} from '../../utils/bonezUtils';
import OwnerBadge from '../../features/collectors/OwnerBadge';
import {nftArrowDirection} from '../../utils/modalKeyboard.mjs';
import { Component, lazy, Suspense, useEffect, useState, useCallback, useRef } from "react";
import { loadPreview, loadOffersPanel } from "../../features/oox/loadPreview";
const OoxPurchasePreview = lazy(loadPreview);
const OfferPanel = lazy(loadOffersPanel);
class PurchasePreviewBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p role="alert">Marketplace controls could not load. Close these details and reopen them to try again.</p> : this.props.children; }
}

import {
  decodePittzAttributes,
  getCollectionBadge,
  getNftImage,
  getPittzStats,
} from "../../utils/nftUtils";

export default function NftDetailModal({
  nft,
  hasMultipleNfts,
  isOwned,
  listed = false,
  offersOpen = false,
  onClose,
  onPrevious,
  onNext,
}) {
  const panelRef=useRef(null);
  const open=!!nft;
  const [imageFailed,setImageFailed]=useState(false);
  useEffect(()=>{setImageFailed(false);},[nft?.identifier]);
  useEffect(()=>{
    if(!open)return;
    const previousFocus=document.activeElement,previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    panelRef.current?.querySelector('button')?.focus({preventScroll:true});
    return()=>{document.body.style.overflow=previousOverflow;if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});};
  },[open]);
  const [purchaseAvailability,setPurchaseAvailability]=useState(null);
  const [verifiedOwner,setVerifiedOwner]=useState(null);
  const onOwnerLoaded=useCallback(data=>setVerifiedOwner({identifier:nft?.identifier,role:data.role}),[nft?.identifier]);
  const onPurchaseAvailable=useCallback((identifier,available)=>setPurchaseAvailability({identifier,available}),[]);
  useEffect(() => {
    if (!nft) return undefined;

    function handleKeyDown(event) {
      if(event.defaultPrevented||document.querySelector('dialog[open]'))return;
      if(event.key==='Tab'){
        const nodes=[...panelRef.current.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(node=>node.getClientRects().length);
        const first=nodes[0],last=nodes.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
        return;
      }
      if(event.key==='Escape'){event.preventDefault();onClose();return;}
      const direction=nftArrowDirection(event);
      if(hasMultipleNfts&&direction){event.preventDefault();if(direction<0)onPrevious();else onNext();}
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasMultipleNfts, nft, onClose, onNext, onPrevious]);

  if (!nft) return null;

  const stats = getPittzStats(nft.attributes);
  const collection = nft.collection || nft.identifier?.split('-').slice(0,2).join('-');
  const traitStats = rarestTraits(nft.attributes, rarity[collection], Infinity);
  const traits = decodePittzAttributes(nft.attributes).map(item => ({...item,...traitStats.find(t => t.trait === item.trait && t.value === item.value)})).sort((a,b)=>(a.count??Infinity)-(b.count??Infinity));
  const earnings = isOwned ? getBonezGeneration({...nft,collection}) : null;
  const badge = getCollectionBadge(nft);
  const image = getNftImage(nft);

  return (
    <div className="nft-detail-modal">
      <div className="nft-detail-backdrop" onClick={onClose}></div>

      <div
        className="nft-detail-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="CryptoPittz NFT details"
      >
        <button className="nft-detail-close" type="button" aria-label="Close NFT details" onClick={onClose}>
          ✕
        </button>

        <div className="nft-detail-art">
          {hasMultipleNfts && (
            <>
              <button
                className="nft-detail-nav nft-detail-prev"
                type="button"
                aria-label="Previous CryptoPittz"
                onClick={onPrevious}
              >
                ‹
              </button>

              <button
                className="nft-detail-nav nft-detail-next"
                type="button"
                aria-label="Next CryptoPittz"
                onClick={onNext}
              >
                ›
              </button>
            </>
          )}

          {image && !imageFailed && (
            <img
              src={image}
              alt={nft.name || nft.identifier}
              onError={() => {
                setImageFailed(true);
              }}
            />
          )}

          {(!image||imageFailed)&&<p role="status">This Pittz image could not load. The identifier and details are still available below.</p>}
          {isOwned && <span className="owned-badge">OWNED ✓</span>}
        </div>

        <div className="nft-detail-content">
          <div className="nft-detail-heading">
            <div>
              <div className="nft-detail-topline">
                <span className="nft-detail-eyebrow">CryptoPittz Collection</span>
                <span className={`collection-badge ${badge.className}`}>{badge.label}</span>
              </div>

              <h2>{nft.name || nft.identifier}</h2>
              <small>{nft.identifier}</small>
            </div>
          </div>

          <OwnerBadge key={'owner-'+nft.identifier} identifier={nft.identifier} onLoaded={onOwnerLoaded}/>



          {import.meta.env.VITE_OOX_PREVIEW === "true" && (
            <PurchasePreviewBoundary key={nft.identifier}><Suspense fallback={<p>Loading marketplace…</p>}>
              <OoxPurchasePreview key={nft.identifier} nft={nft} isOwned={isOwned} onPurchaseAvailable={onPurchaseAvailable} />
            </Suspense></PurchasePreviewBoundary>
          )}

          {listed&&!isOwned&&!(purchaseAvailability?.identifier===nft.identifier&&purchaseAvailability.available)&&<div><button className="btn primary" disabled>Buy</button><p className="pittz-offer-note">Buying is unavailable until the current listing can be verified.</p></div>}
          {listed&&import.meta.env.VITE_OOX_TRANSACTIONS!=='true'&&<p className="pittz-offer-note" role="status">For sale · Purchases are disabled in this preview.</p>}
          {(offersOpen||(!isOwned&&!listed&&!(purchaseAvailability?.identifier===nft.identifier&&purchaseAvailability.available)&&verifiedOwner?.identifier===nft.identifier&&verifiedOwner.role==='owner'))&&<PurchasePreviewBoundary key={'offers-'+nft.identifier}><Suspense fallback={<p>Loading offer controls…</p>}><OfferPanel key={nft.identifier} initialOpen={offersOpen} nft={nft} isOwned={isOwned} listed={listed||Boolean(purchaseAvailability?.identifier===nft.identifier&&purchaseAvailability.available)}/></Suspense></PurchasePreviewBoundary>}

          <div className="nft-detail-stats">
            {stats.rank && (
              <div className="nft-detail-stat rank-stat">
                <span>🏆 Rank</span>
                <strong>#{stats.rank}</strong>
              </div>
            )}

            {stats.score && (
              <div className="nft-detail-stat">
                <span>⚡ Score</span>
                <strong>{stats.score}</strong>
              </div>
            )}

            {stats.bloodline && (
              <div className="nft-detail-stat">
                <span>Bloodline</span>
                <strong>{stats.bloodline}</strong>
              </div>
            )}

            {!earnings && traitStats[0] && <div className="nft-detail-stat rarest-detail-stat">
              <span>💎 Rarest · {traitStats[0].trait}</span>
              <strong>{traitStats[0].value}</strong>
              <small className="trait-frequency">{traitStats[0].percentage.toFixed(2)}% · 1 of {traitStats[0].count.toLocaleString()}</small>
            </div>}
            {earnings && <div className="nft-detail-stat earnings-stat"><span>🦴 Potential BONEZ / day</span><strong>{earnings.daily.toLocaleString(undefined,{maximumFractionDigits:2})}</strong></div>}

          </div>

          {stats.type && <p className="nft-type-label">Type · {stats.type}</p>}
          {earnings && <p className="nft-earnings-summary">Potential BONEZ · {earnings.weekly.toLocaleString()} weekly · {earnings.monthly.toLocaleString()} per 30 days</p>}
          <h3 className="nft-traits-heading">Trait rarity <small>Rarest first · {collection === 'PITTZVICE-c3ec94' ? 'Vice' : 'Original'}</small></h3>
          <div className="nft-detail-traits">
            {traits.map((item) => (
              <div className="nft-detail-trait" key={`${nft.identifier}-${item.trait}`}>
                <span>{item.trait}</span>
                <strong>{item.value}</strong>
                {item.count != null && <small className="trait-frequency">{item.percentage.toFixed(2)}% <span>· 1 of {item.count.toLocaleString()}</span></small>}
              </div>
            ))}
          </div>
          <button className="btn" type="button" onClick={onClose}>Close details</button>
        </div>
      </div>
    </div>
  );
}
