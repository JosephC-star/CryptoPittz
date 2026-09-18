import { useState } from "react";

import NftCard from "../../components/nft/NftCard";
import { getBonezGeneration, getBonezWalletTotals } from "../../utils/bonezUtils";
import { formatBonezUsd } from "../../utils/formatters";
import { getPittzStats } from "../../utils/nftUtils";

function MyPittzSection({ address, nfts, loading, error, bonezUsdPrice, onOpenNft }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("rank");
  const [bloodlineFilter, setBloodlineFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [collection, setCollection] = useState("original");

  const ownedOriginalPittz = nfts.filter((nft) => nft.collection === "PITTZ-1a4c2d");
  const ownedVicePittz = nfts.filter((nft) => nft.collection === "PITTZVICE-c3ec94");
  const activeOwnedPittz = collection === "vice" ? ownedVicePittz : ownedOriginalPittz;

  const walletSummary = (() => {
    if (!nfts.length) {
      return { total: 0, bestRank: null, highestScore: null, bloodlines: {}, types: {} };
    }

    const summaries = nfts.map((nft) => getPittzStats(nft.attributes));
    const ranks = summaries
      .map((item) => Number(item.rank))
      .filter((value) => Number.isFinite(value) && value > 0);
    const scores = summaries
      .map((item) => Number(item.score))
      .filter((value) => Number.isFinite(value));
    const bloodlines = {};
    const types = {};

    summaries.forEach((item) => {
      if (item.bloodline) bloodlines[item.bloodline] = (bloodlines[item.bloodline] || 0) + 1;
      if (item.type) types[item.type] = (types[item.type] || 0) + 1;
    });

    return {
      total: nfts.length,
      bestRank: ranks.length ? Math.min(...ranks) : null,
      highestScore: scores.length ? Math.max(...scores) : null,
      bloodlines,
      types,
    };
  })();

  const filteredNfts = activeOwnedPittz
    .filter((nft) => {
      const stats = getPittzStats(nft.attributes);
      const normalizedSearch = searchTerm.toLowerCase();
      const matchesSearch =
        nft.name?.toLowerCase().includes(normalizedSearch) ||
        nft.identifier?.toLowerCase().includes(normalizedSearch);
      const matchesBloodline = bloodlineFilter === "all" || stats.bloodline === bloodlineFilter;
      const matchesType = typeFilter === "all" || stats.type === typeFilter;

      return matchesSearch && matchesBloodline && matchesType;
    })
    .sort((a, b) => {
      const aStats = getPittzStats(a.attributes);
      const bStats = getPittzStats(b.attributes);

      if (sortBy === "rank") {
        return Number(aStats.rank || Infinity) - Number(bStats.rank || Infinity);
      }
      if (sortBy === "score") return Number(bStats.score || 0) - Number(aStats.score || 0);
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      return 0;
    });

  const bonezWalletTotals = getBonezWalletTotals(nfts);
  const liveUsdPrice = Number(bonezUsdPrice);
  const bonezWalletUsdValues = {
    daily: Number.isFinite(liveUsdPrice) ? bonezWalletTotals.daily * liveUsdPrice : null,
    weekly: Number.isFinite(liveUsdPrice) ? bonezWalletTotals.weekly * liveUsdPrice : null,
    monthly: Number.isFinite(liveUsdPrice) ? bonezWalletTotals.monthly * liveUsdPrice : null,
  };

  function resetFilters() {
    setSearchTerm("");
    setSortBy("rank");
    setBloodlineFilter("all");
    setTypeFilter("all");
  }

  return (
    <section id="my-pittz">
      <div className="section-title">
        <h2>My Pittz</h2>
        <span>Your CryptoPittz collection.</span>
      </div>

      <div className="explorer-tabs my-pittz-tabs">
        <button
          type="button"
          className={`explorer-tab ${collection === "original" ? "active" : ""}`}
          onClick={() => setCollection("original")}
        >
          Original Pittz
          <span>{ownedOriginalPittz.length}</span>
        </button>

        <button
          type="button"
          className={`explorer-tab ${collection === "vice" ? "active" : ""}`}
          onClick={() => setCollection("vice")}
        >
          Vice Pittz
          <span>{ownedVicePittz.length}</span>
        </button>
      </div>

      <div className="panel">
        <div className="inner">
          {!address && <p className="subtitle">Connect your wallet to see your NFTs.</p>}
          {address && loading && <p className="subtitle">Searching your wallet...</p>}
          {address && error && <p className="subtitle">{error}</p>}
          {address && !loading && !error && nfts.length === 0 && (
            <p className="subtitle">No NFTs were found in this wallet.</p>
          )}

          {address && !loading && !error && nfts.length > 0 && (
            <>
              <p className="subtitle">
                You own {nfts.length} CryptoPittz NFT{nfts.length === 1 ? "" : "s"}.
              </p>

              <div className="wallet-summary">
                <div className="wallet-summary-main">
                  <div className="wallet-summary-card">
                    <span>CryptoPittz Owned</span>
                    <strong>{walletSummary.total}</strong>
                  </div>
                  <div className="wallet-summary-card">
                    <span>Best Rank</span>
                    <strong>{walletSummary.bestRank ? `#${walletSummary.bestRank}` : "—"}</strong>
                  </div>
                  <div className="wallet-summary-card">
                    <span>Highest Score</span>
                    <strong>{walletSummary.highestScore ?? "—"}</strong>
                  </div>
                </div>

                <div className="wallet-summary-breakdown">
                  <div className="summary-group">
                    <span className="summary-title">Bloodlines</span>
                    <div className="summary-chips">
                      {Object.entries(walletSummary.bloodlines).map(([bloodline, count]) => (
                        <div className="summary-chip" key={bloodline}>
                          <strong>{bloodline}</strong>
                          <span>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="summary-group">
                    <span className="summary-title">Types</span>
                    <div className="summary-chips">
                      {Object.entries(walletSummary.types).map(([type, count]) => (
                        <div className="summary-chip" key={type}>
                          <strong>{type}</strong>
                          <span>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bonez-wallet-total">
                <div className="bonez-wallet-total-heading">
                  <div>
                    <span className="bonez-wallet-eyebrow">🦴 Wallet Utility</span>
                    <h3>Potential BONEZ Generation</h3>
                    <p>Estimated potential based on your owned Pittz and their tier rates.</p>
                  </div>
                  <div className="bonez-wallet-count">
                    <strong>{bonezWalletTotals.pittz}</strong>
                    <span>Pittz</span>
                  </div>
                </div>

                <div className="bonez-wallet-total-grid">
                  {[
                    ["Daily", "daily"],
                    ["Weekly", "weekly"],
                    ["Estimated 30 Days", "monthly"],
                  ].map(([label, period]) => (
                    <div className="bonez-wallet-total-stat" key={period}>
                      <span>{label}</span>
                      <strong>{bonezWalletTotals[period].toFixed(2)}</strong>
                      <small>BONEZ</small>
                      <small>
                        {bonezWalletUsdValues[period] !== null
                          ? `≈ ${formatBonezUsd(bonezWalletUsdValues[period])}`
                          : "Live price unavailable"}
                      </small>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pittz-controls">
                <input
                  type="text"
                  placeholder="Search Pittz..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="rank">Best Rank</option>
                  <option value="score">Highest Score</option>
                  <option value="name">Name</option>
                </select>
                <select
                  value={bloodlineFilter}
                  onChange={(event) => setBloodlineFilter(event.target.value)}
                >
                  <option value="all">All Bloodlines</option>
                  {Object.keys(walletSummary.bloodlines).map((bloodline) => (
                    <option key={bloodline} value={bloodline}>
                      {bloodline}
                    </option>
                  ))}
                </select>
                <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                  <option value="all">All Types</option>
                  {Object.keys(walletSummary.types).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pittz-results-bar">
                <span>
                  Showing {filteredNfts.length} of {activeOwnedPittz.length}{" "}
                  {collection === "vice" ? "Vice Pittz" : "Original Pittz"}
                </span>
                {(searchTerm ||
                  bloodlineFilter !== "all" ||
                  typeFilter !== "all" ||
                  sortBy !== "rank") && (
                  <button className="reset-filters" type="button" onClick={resetFilters}>
                    ↻ Reset Filters
                  </button>
                )}
              </div>

              <div className="wallet-nft-grid">
                {filteredNfts.map((nft) => (
                  <NftCard
                    key={nft.identifier}
                    nft={nft}
                    bonez={getBonezGeneration(nft)}
                    isOwned
                    showTraits
                    onClick={() => onOpenNft(nft, filteredNfts)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default MyPittzSection;
