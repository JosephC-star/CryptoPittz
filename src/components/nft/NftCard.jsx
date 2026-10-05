import {
  decodePittzAttributes,
  getNftImage,
  getNftMarketplace,
  getPittzStats,
} from "../../utils/nftUtils";

function formatListingPrice(listing) {
  const price = Number(listing?.price);
  if (!Number.isFinite(price)) return listing?.price || "";
  if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return price.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

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
  const image = getNftImage(nft);
  const isExplorer = variant === "explorer";

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
        {isExplorer && listing && <span className="listed-badge">FOR SALE</span>}
      </div>

      <div className="wallet-nft-info">
        <strong>{nft.name || nft.identifier}</strong>
        <small>{nft.identifier}</small>

        {isExplorer && listing && (
          <div className="oox-listing">
            <div>
              <span>OOX LISTING</span>
              <strong>
                {formatListingPrice(listing)} {listing.paymentToken.split("-")[0]}
              </strong>
            </div>
            <a
              href={getNftMarketplace(nft)}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
            >
              VIEW ON OOX ↗
            </a>
          </div>
        )}

        <div className="pittz-stats">
          {stats.rank && (
            <div className="pittz-stat rank-stat">
              <span>🏆 Rank</span>
              <strong>#{stats.rank}</strong>
            </div>
          )}

          {stats.score && (
            <div className="pittz-stat">
              <span>⚡ Score</span>
              <strong>{stats.score}</strong>
            </div>
          )}

          {stats.bloodline && (
            <div className="pittz-stat">
              <span>Bloodline</span>
              <strong>{stats.bloodline}</strong>
            </div>
          )}

          {stats.type && (
            <div className="pittz-stat">
              <span>Type</span>
              <strong>{stats.type}</strong>
            </div>
          )}
        </div>

        {bonez && (
          <div className="bonez-generation">
            <div className="bonez-generation-header">
              <span>🦴 Potential BONEZ</span>
              <strong>{bonez.tier} Tier</strong>
            </div>

            <div className="bonez-generation-grid">
              <div>
                <span>Daily</span>
                <strong>{bonez.daily.toFixed(2)}</strong>
              </div>
              <div>
                <span>Weekly</span>
                <strong>{bonez.weekly.toFixed(2)}</strong>
              </div>
              <div>
                <span>30 Days</span>
                <strong>{bonez.monthly.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        )}

        {traits.length > 0 && (
          <div className="pittz-traits">
            {traits.map((item) => (
              <div className="pittz-trait" key={`${nft.identifier}-${item.trait}`}>
                <span>{item.trait}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
