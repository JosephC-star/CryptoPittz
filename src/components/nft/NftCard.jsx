import {getBonezGeneration} from '../../utils/bonezUtils';
import rarity from '../../data/trait-rarity.json';
import { rarestTraits } from '../../utils/traitRarity.mjs';
import {
  decodePittzAttributes,
  getNftImage,
  getPittzStats,
} from "../../utils/nftUtils";

import { compactNftPrice } from '../../utils/nftPrice';
function formatListingPrice(listing) { return compactNftPrice(listing?.price ?? ''); }

export default function NftCard({
  nft,
  bonez = null,
  isOwned = false,
  listing = null,
  showTraits = false,
  variant = "wallet",
  onClick,
}) {
  const stats = getPittzStats(nft.attributes);
  const traits = showTraits ? decodePittzAttributes(nft.attributes) : [];
  const collection = nft.collection || nft.identifier?.split('-').slice(0,2).join('-');
  const rareTraits = rarestTraits(nft.attributes, rarity[collection], isOwned ? 2 : Infinity);
  const earnings = isOwned ? (bonez || getBonezGeneration({...nft,collection})) : null;
  const image = getNftImage(nft);
  const isExplorer = variant === "explorer";
  const compactTraits = isExplorer && !isOwned;
  const traitBox = item => <div className="pittz-stat rarity-stat" key={item.trait} title={`${item.trait}: ${item.value} — 1 of ${item.count} with this trait in this collection`}><span>{item.trait}</span><strong>{item.value}</strong><small>{item.percentage.toFixed(2)}% · 1 of {item.count.toLocaleString()}</small></div>;

  return (
    <div
      className={`wallet-nft-card ${isExplorer ? "explorer-card" : ""} ${
        isExplorer && isOwned ? "owned-card" : ""
      }`}
      onClick={onClick}
    >
      <div className="wallet-nft-image-wrap">
        {image && (
          <img
            src={image}
            alt={nft.name || nft.identifier}
            style={
              isExplorer
                ? undefined
                : {
                    display: "block",
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: 1,
                    visibility: "visible",
                    position: "relative",
                    zIndex: 2,
                  }
            }
            onError={(event) => {
              console.error("NFT image failed:", nft.identifier, event.currentTarget.src);
            }}
          />
        )}

        {isOwned && <span className="owned-badge">OWNED ✓</span>}
        {isExplorer && listing && <>
          <span className="listed-badge">FOR SALE</span>
          <span className={`listing-marketplace-badge ${isOwned ? 'with-owned-badge' : ''}`} aria-label={`Listing marketplace: ${listing.marketplace || 'unverified'}`}>{listing.marketplace === undefined ? 'CHECKING' : listing.marketplace || 'UNVERIFIED'}</span>
        </>}
      </div>

      <div className="wallet-nft-info">
        <strong>{nft.name || nft.identifier}</strong>
        <small>{nft.identifier}</small>

        {isExplorer && listing && (
          <div className="oox-listing">
            <div>
              <span>{listing.marketplace ? `${listing.marketplace} LISTING` : "MARKETPLACE LISTING"}</span>
              <strong>
                {formatListingPrice(listing)} {listing.paymentToken.split("-")[0]}
              </strong>
            </div>
            <button
              type="button"
              className="explorer-buy-button"
              aria-label={`Buy ${nft.name || nft.identifier}`}
              onClick={(event) => { event.stopPropagation(); onClick?.(); }}
            >
              BUY →
            </button>
          </div>
        )}

        <div className={`pittz-stats ${compactTraits ? "compact-trait-stats" : ""}`}>
          {stats.rank && (
            <div className="pittz-stat rank-stat">
              <span>🏆 Rank</span>
              <strong>#{stats.rank}</strong>
            </div>
          )}

          {earnings && <div className="pittz-stat earnings-stat"><span>🦴 BONEZ / day</span><strong>{earnings.daily.toLocaleString(undefined,{maximumFractionDigits:2})}</strong></div>}
          {rareTraits.slice(0,2).map(traitBox)}

        </div>

        {compactTraits && <details className="card-trait-details" onClick={event=>event.stopPropagation()} onKeyDown={event=>event.stopPropagation()}><summary>More traits &amp; details</summary><div className="pittz-stats">{rareTraits.slice(2).map(traitBox)}</div>{stats.type&&<small className="nft-type-label">Type · {stats.type}</small>}<button type="button" className="card-open-details" onClick={event=>{event.stopPropagation();onClick?.();}}>Open Pittz details ↗</button></details>}

        {isOwned && <button type="button" className="btn owned-pittz-action" onClick={event=>{event.stopPropagation();onClick?.();}}>Sell / Send this Pittz →</button>}
        {!compactTraits && stats.type && <small className="nft-type-label">Type · {stats.type}</small>}

        {traits.length > 0 && (
          <div className="pittz-traits">
            {traits.map((item) => (
              <div className="pittz-trait" key={`${nft.identifier}-${item.trait}`}>
                <span>{item.trait}</span>
                <strong>{item.value}</strong>
                {rarity[collection]?.traits[item.trait]?.[item.value] && <small className="trait-frequency">{(rarity[collection].traits[item.trait][item.value] / rarity[collection].total * 100).toFixed(2)}% · 1 of {rarity[collection].traits[item.trait][item.value].toLocaleString()}</small>}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
