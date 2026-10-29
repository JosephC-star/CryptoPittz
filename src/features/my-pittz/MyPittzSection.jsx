const SendPittz=lazy(async()=>{const {Buffer}=await import('buffer');globalThis.Buffer??=Buffer;return import('../send-pittz/SendPittz');});
import { lazy, Suspense, useEffect, useRef, useState } from "react";

import NftCard from "../../components/nft/NftCard";
import { getBonezGeneration, getBonezWalletTotals } from "../../utils/bonezUtils";
import { formatBonezUsd } from "../../utils/formatters";
import { getPittzStats, getPittzTraits } from "../../utils/nftUtils";
import TraitFinder from "../traits/TraitFinder";

const PITTZ_PER_PAGE = 40;

import { loadMyListings, loadReceivedOffersView } from '../oox/loadPreview';
const MyListings=lazy(loadMyListings);
const MyReceivedOffers=lazy(loadReceivedOffersView);

function MyPittzSection({ address, nfts, loading, error, bonezUsdPrice, onOpenNft, onRetry, onConnect }) {
  const [expanded, setExpanded] = useState(true);
  const [earningsExpanded,setEarningsExpanded]=useState(()=>!window.matchMedia('(max-width: 640px)').matches);
  useEffect(()=>{setEarningsExpanded(!window.matchMedia('(max-width: 640px)').matches);},[address]);
  const headingRef = useRef(null);
  const toggleRef = useRef(null);
  function retractMyPittz() {
    setExpanded(false);
    toggleRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }
  const [view,setView]=useState("wallet");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("rank");
  const [bloodlineFilter, setBloodlineFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [collection, setCollection] = useState("all");
  const [walletTraits, setWalletTraits] = useState({});
  const [page, setPage] = useState(1);

  const ownedOriginalPittz = nfts.filter((nft) => nft.collection === "PITTZ-1a4c2d");
  const ownedVicePittz = nfts.filter((nft) => nft.collection === "PITTZVICE-c3ec94");
  const activeOwnedPittz = collection === "all" ? [...ownedOriginalPittz, ...ownedVicePittz] : collection === "vice" ? ownedVicePittz : ownedOriginalPittz;

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
      const traits = getPittzTraits(nft.attributes);
      const matchesTraits = Object.entries(walletTraits).every(([category, values]) =>
        traits.some((item) => item.trait === category && values.includes(item.value)),
      );

      return matchesSearch && matchesBloodline && matchesType && matchesTraits;
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
  const totalPages = Math.max(1, Math.ceil(filteredNfts.length / PITTZ_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visibleNfts = filteredNfts.slice(
    (currentPage - 1) * PITTZ_PER_PAGE,
    currentPage * PITTZ_PER_PAGE,
  );

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
    setWalletTraits({});
    setPage(1);
  }

  return (
    <section id="my-pittz" ref={headingRef}>
      <div className="section-title explorer-heading">
        <div>
          <h2>My Pittz</h2>
          <span>{!address || expanded ? "Your CryptoPittz collection." : loading ? "Searching your wallet..." : error ? "Expand to view your wallet status." : `${nfts.length} CryptoPittz tucked away. Expand to browse your pack.`}</span>
        </div>
        {address && <button ref={toggleRef} type="button" className="explorer-fold-toggle" aria-expanded={expanded} aria-controls="my-pittz-content" onClick={() => setExpanded((open) => !open)}>
          {expanded ? "Retract My Pittz" : "Expand My Pittz"}
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style={{ transform: expanded ? "rotate(180deg)" : undefined }}><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>}
      </div>
      <div id="my-pittz-content" hidden={Boolean(address) && !expanded}>

      <div className="explorer-tabs my-pittz-tabs" aria-label="Wallet views">{[['wallet','My Pittz'],['listings','My Listings'],['offers','Offers received'],['send','Send a Pittz →']].map(([id,label])=><button key={id} className={`explorer-tab ${view===id?'active':''}`} aria-pressed={view===id} onClick={()=>setView(id)}>{label}</button>)}</div>
      {view==='send' ? <Suspense fallback={<p>Loading transfer controls…</p>}><SendPittz key={address||'disconnected'} address={address} nfts={nfts} onRefresh={onRetry} onConnect={onConnect}/></Suspense> : view==='offers' ? <Suspense fallback={<p>Loading offers…</p>}><MyReceivedOffers key={address||'disconnected'} address={address} nfts={nfts} loading={loading} error={error} onRetry={onRetry} onConnect={onConnect} onOpenNft={onOpenNft}/></Suspense> : view==='listings' ? <Suspense fallback={<p>Loading listings…</p>}><MyListings key={address||'disconnected'} address={address}/></Suspense> : <>
      <div className="explorer-tabs my-pittz-tabs" aria-label="My Pittz collections">
        <button type="button" className={`explorer-tab ${collection === "all" ? "active" : ""}`} aria-pressed={collection === "all"} onClick={() => { setCollection("all"); setWalletTraits({}); setPage(1); }}>
          All Pittz <span>{ownedOriginalPittz.length + ownedVicePittz.length}</span>
        </button>
        <button
          type="button"
          className={`explorer-tab ${collection === "original" ? "active" : ""}`}
          onClick={() => {
            setCollection("original");
            setWalletTraits({});
            setPage(1);
          }}
        >
          Original Pittz
          <span>{ownedOriginalPittz.length}</span>
        </button>

        <button
          type="button"
          className={`explorer-tab ${collection === "vice" ? "active" : ""}`}
          onClick={() => {
            setCollection("vice");
            setWalletTraits({});
            setPage(1);
          }}
        >
          Vice Pittz
          <span>{ownedVicePittz.length}</span>
        </button>
      </div>

      <div className="panel">
        <div className="inner">
          {!address&&<div><p>Connect your wallet to see your Original and Vice Pittz.</p><button className="btn" onClick={onConnect}>Connect wallet</button></div>}
          {address && loading && <p className="subtitle" role="status">Searching your wallet...</p>}
          {address&&error&&<div role="status"><p>{error}</p><button className="btn" onClick={onRetry} disabled={loading}>Retry wallet lookup</button></div>}
          {address && !loading && !error && nfts.length === 0 && (
            <div role="status"><p>No Original or Vice Pittz were found in this wallet. Other NFTs are not shown here.</p><a className="btn" href="/dawg-pound/?collection=original">Browse Pittz for sale</a><button className="btn" onClick={onRetry}>Refresh wallet</button></div>
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

                <button type="button" className="explorer-fold-toggle bonez-earnings-toggle" aria-expanded={earningsExpanded} aria-controls="bonez-wallet-generation" onClick={()=>setEarningsExpanded(value=>!value)}>{earningsExpanded?'Hide earnings':'Show earnings'}<span aria-hidden="true">{earningsExpanded?' ↑':' ↓'}</span></button>
                <div id="bonez-wallet-generation" className="bonez-wallet-total-grid" hidden={!earningsExpanded}>
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
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setPage(1);
                  }}
                />
                <select value={sortBy} onChange={(event) => {
                  setSortBy(event.target.value);
                  setPage(1);
                }}>
                  <option value="rank">Best Rank</option>
                  <option value="score">Highest Score</option>
                  <option value="name">Name</option>
                </select>
                <select
                  value={bloodlineFilter}
                  onChange={(event) => {
                    setBloodlineFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All Bloodlines</option>
                  {Object.keys(walletSummary.bloodlines).map((bloodline) => (
                    <option key={bloodline} value={bloodline}>
                      {bloodline}
                    </option>
                  ))}
                </select>
                <select value={typeFilter} onChange={(event) => {
                  setTypeFilter(event.target.value);
                  setPage(1);
                }}>
                  <option value="all">All Types</option>
                  {Object.keys(walletSummary.types).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <TraitFinder
                id="my-pittz-traits"
                nfts={activeOwnedPittz}
                loading={loading}
                selected={walletTraits}
                title="🔎 Filter My Pittz by Traits"
                description="Combine traits to search only the Pittz in your wallet"
                indexLabel="YOUR WALLET INDEX"
                onSelectedChange={(nextTraits) => {
                  setWalletTraits(nextTraits);
                  setPage(1);
                }}
              />

              <div className="pittz-results-bar">
                <span>
                  Showing {visibleNfts.length} of {filteredNfts.length} matching{" "}
                  {collection === "all" ? "All Pittz" : collection === "vice" ? "Vice Pittz" : "Original Pittz"}
                </span>
                {(searchTerm ||
                  bloodlineFilter !== "all" ||
                  typeFilter !== "all" ||
                  Object.keys(walletTraits).length > 0 ||
                  sortBy !== "rank") && (
                  <button className="reset-filters" type="button" onClick={resetFilters}>
                    ↻ Reset Filters
                  </button>
                )}
              </div>

              {!filteredNfts.length&&<div role="status"><p>No Pittz match your filters. Clear the filters or choose another collection.</p><button className="btn" onClick={resetFilters}>Clear filters</button></div>}
              <div className="wallet-nft-grid owned-nft-grid">
                {visibleNfts.map((nft) => (
                  <NftCard
                    key={nft.identifier}
                    nft={nft}
                    bonez={getBonezGeneration(nft)}
                    isOwned
                    showTraits
                    onClick={() => onOpenNft(nft, visibleNfts)}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <nav className="my-pittz-pagination" aria-label="My Pittz pages">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                  >
                    ← Previous
                  </button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  >
                    Next →
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
      </>}
      {address && !loading && !error && nfts.length > 0 && <div className="explorer-fold-footer">
        <button type="button" className="explorer-fold-toggle" onClick={retractMyPittz}>Retract My Pittz ↑</button>
        <span>Tuck the pack away and keep exploring.</span>
      </div>}
      </div>
    </section>
  );
}

export default MyPittzSection;

