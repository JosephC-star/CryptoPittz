import { useMemo, useState } from "react";

import ExplorerPagination from "../../components/explorer/ExplorerPagination";
import NftCard from "../../components/nft/NftCard";
import { getPittzTraits } from "../../utils/nftUtils";
import "./TraitFinder.css";

const RESULTS_PER_PAGE = 24;

function TraitFinder({
  collection,
  collectionName,
  nfts,
  loading,
  originalTotal,
  viceTotal,
  onCollectionChange,
  onOpenNft,
}) {
  const [selected, setSelected] = useState({});
  const [traitSearch, setTraitSearch] = useState("");
  const [page, setPage] = useState(0);

  const nftTraits = useMemo(
    () => nfts.map((nft) => ({ nft, traits: getPittzTraits(nft.attributes) })),
    [nfts],
  );

  const catalog = useMemo(() => {
    const categories = new Map();
    nftTraits.forEach(({ traits }) => {
      traits.forEach(({ trait, value }) => {
        if (!categories.has(trait)) categories.set(trait, new Map());
        const values = categories.get(trait);
        values.set(value, (values.get(value) || 0) + 1);
      });
    });

    return Array.from(categories, ([trait, values]) => ({
      trait,
      values: Array.from(values, ([value, count]) => ({ value, count })).sort(
        (a, b) => b.count - a.count || a.value.localeCompare(b.value),
      ),
    })).sort((a, b) => a.trait.localeCompare(b.trait));
  }, [nftTraits]);

  const activeFilters = Object.entries(selected).flatMap(([trait, values]) =>
    values.map((value) => ({ trait, value })),
  );

  const matches = useMemo(() => {
    if (!Object.keys(selected).length) return [];
    return nftTraits
      .filter(({ traits }) =>
        Object.entries(selected).every(([category, selectedValues]) =>
          traits.some(
            (item) => item.trait === category && selectedValues.includes(item.value),
          ),
        ),
      )
      .map(({ nft }) => nft);
  }, [nftTraits, selected]);

  const visibleMatches = matches.slice(page * RESULTS_PER_PAGE, (page + 1) * RESULTS_PER_PAGE);
  const normalizedSearch = traitSearch.trim().toLowerCase();

  function toggleTrait(trait, value) {
    setSelected((current) => {
      const currentValues = current[trait] || [];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];
      const next = { ...current };
      if (nextValues.length) next[trait] = nextValues;
      else delete next[trait];
      return next;
    });
    setPage(0);
  }

  function clearTraits() {
    setSelected({});
    setTraitSearch("");
    setPage(0);
  }

  function changeCollection(nextCollection) {
    clearTraits();
    onCollectionChange(nextCollection);
  }

  return (
    <section id="traits" className="trait-finder">
      <div className="section-title">
        <h2>PittzStop Trait Finder</h2>
        <span>Find the exact Pitt by combining collection traits.</span>
      </div>

      <div className="explorer-tabs">
        <button
          type="button"
          className={`explorer-tab ${collection === "original" ? "active" : ""}`}
          onClick={() => changeCollection("original")}
        >
          Original Pittz <span>{originalTotal?.toLocaleString() || "..."}</span>
        </button>
        <button
          type="button"
          className={`explorer-tab ${collection === "vice" ? "active" : ""}`}
          onClick={() => changeCollection("vice")}
        >
          Vice Pittz <span>{viceTotal?.toLocaleString() || "..."}</span>
        </button>
      </div>

      <div className="trait-finder-shell">
        <aside className="trait-filter-panel">
          <div className="trait-filter-heading">
            <div><span>PITTZSTOP INDEX</span><strong>{collectionName}</strong></div>
            {activeFilters.length > 0 && <button type="button" onClick={clearTraits}>Clear all</button>}
          </div>

          <input
            className="trait-search"
            type="search"
            value={traitSearch}
            onChange={(event) => setTraitSearch(event.target.value)}
            placeholder="Search traits, e.g. Gold Snapback"
          />

          {loading && <p className="trait-loading">Indexing collection traits...</p>}

          <div className="trait-category-list">
            {catalog.map(({ trait, values }) => {
              const shownValues = values.filter(({ value }) =>
                `${trait} ${value}`.toLowerCase().includes(normalizedSearch),
              );
              if (normalizedSearch && !shownValues.length) return null;

              return (
                <details key={trait} open={Boolean(normalizedSearch || selected[trait]?.length)}>
                  <summary><span>{trait}</span><small>{values.length}</small></summary>
                  <div className="trait-value-list">
                    {shownValues.map(({ value, count }) => {
                      const active = selected[trait]?.includes(value);
                      return (
                        <button
                          type="button"
                          className={active ? "active" : ""}
                          onClick={() => toggleTrait(trait, value)}
                          key={value}
                        >
                          <span>{active ? "✓" : "+"} {value}</span><small>{count}</small>
                        </button>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>
        </aside>

        <div className="trait-results">
          <div className="trait-results-header">
            <div><span>MATCHING PITTZ</span><strong>{activeFilters.length ? matches.length.toLocaleString() : "Choose a trait"}</strong></div>
            <a
              href={collection === "vice"
                ? "https://www.oox.art/marketplace/collections/PITTZVICE-c3ec94"
                : "https://www.oox.art/marketplace/collections/PITTZ-1a4c2d"}
              target="_blank"
              rel="noreferrer"
            >
              Browse on OOX ↗
            </a>
          </div>

          {activeFilters.length > 0 && (
            <div className="active-trait-chips">
              {activeFilters.map(({ trait, value }) => (
                <button type="button" onClick={() => toggleTrait(trait, value)} key={`${trait}-${value}`}>
                  <small>{trait}</small>{value} ×
                </button>
              ))}
            </div>
          )}

          {!activeFilters.length && (
            <div className="trait-empty"><span>🔎</span><h3>Build your Pitt search</h3><p>Select one or more traits to reveal matching CryptoPittz.</p></div>
          )}

          {activeFilters.length > 0 && !matches.length && (
            <div className="trait-empty"><span>🐾</span><h3>No Pittz found</h3><p>Remove a trait or try another combination.</p></div>
          )}

          {visibleMatches.length > 0 && (
            <div className="wallet-nft-grid trait-results-grid">
              {visibleMatches.map((nft) => (
                <NftCard
                  key={nft.identifier}
                  nft={nft}
                  variant="explorer"
                  onClick={() => onOpenNft(nft, matches)}
                />
              ))}
            </div>
          )}

          {matches.length > RESULTS_PER_PAGE && (
            <ExplorerPagination
              currentPage={page}
              totalItems={matches.length}
              pageSize={RESULTS_PER_PAGE}
              onPageChange={setPage}
            />
          )}
        </div>
      </div>
    </section>
  );
}

export default TraitFinder;
