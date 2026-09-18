import { useEffect } from "react";

import {
  decodePittzAttributes,
  getCollectionBadge,
  getNftImage,
  getNftMarketplace,
  getPittzStats,
} from "../../utils/nftUtils";

export default function NftDetailModal({
  nft,
  hasMultipleNfts,
  isOwned,
  onClose,
  onPrevious,
  onNext,
}) {
  useEffect(() => {
    if (!nft) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && hasMultipleNfts) onPrevious();
      if (event.key === "ArrowRight" && hasMultipleNfts) onNext();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasMultipleNfts, nft, onClose, onNext, onPrevious]);

  if (!nft) return null;

  const stats = getPittzStats(nft.attributes);
  const traits = decodePittzAttributes(nft.attributes);
  const badge = getCollectionBadge(nft);
  const image = getNftImage(nft);

  return (
    <div className="nft-detail-modal">
      <div className="nft-detail-backdrop" onClick={onClose}></div>

      <div
        className="nft-detail-panel"
        role="dialog"
        aria-modal="true"
        aria-label="CryptoPittz NFT details"
      >
        <button className="nft-detail-close" type="button" onClick={onClose}>
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

          {image && (
            <img
              src={image}
              alt={nft.name || nft.identifier}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          )}

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

          <div className="nft-detail-actions">
            <a
              className="btn primary"
              href={getNftMarketplace(nft)}
              target="_blank"
              rel="noreferrer"
            >
              🛒 View on OOX Marketplace ↗
            </a>
          </div>

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

            {stats.type && (
              <div className="nft-detail-stat">
                <span>Type</span>
                <strong>{stats.type}</strong>
              </div>
            )}
          </div>

          <div className="nft-detail-traits">
            {traits.map((item) => (
              <div className="nft-detail-trait" key={`${nft.identifier}-${item.trait}`}>
                <span>{item.trait}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
