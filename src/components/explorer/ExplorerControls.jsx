export default function ExplorerControls({
  activeCollection,
  rankOrder,
  onRankOrderChange,
  collectionTotal,
  indexLoading,
  indexReady,
  loadProgress,
  search,
  onSearchChange,
  onSearch,
  shownCount,
  filteredCount,
  onReset,
}) {
  const filtersActive = Boolean(search) || rankOrder.startsWith("type-");
  const progressPercent =
    loadProgress.total > 0
      ? Math.min(100, (loadProgress.loaded / loadProgress.total) * 100)
      : 0;

  return (
    <>
      <div className="explorer-header">
        <div>
          <span>Collection</span>
          <strong>
            {collectionTotal.toLocaleString()} {activeCollection.name}
          </strong>
        </div>

        <div>
          <span>Collection ID</span>
          <strong>{activeCollection.collection === "both" ? "PITTZ-1a4c2d + PITTZVICE-c3ec94" : activeCollection.collection}</strong>
        </div>

        {indexLoading && (
          <div className="explorer-index-status">
            <div className="explorer-index-status-top">
              <span>Building Explorer Index</span>
              <strong>
                {loadProgress.loaded.toLocaleString()} / {loadProgress.total.toLocaleString()}
              </strong>
            </div>

            <div className="explorer-index-progress">
              <div
                className="explorer-index-progress-bar"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <small>Preparing collection-wide ranks and traits.</small>
          </div>
        )}

        {indexReady && (
          <div className="explorer-index-ready">
            <span>✓</span>
            <div>
              <strong>Explorer Index Ready</strong>
              <small>{loadProgress.total.toLocaleString()} Pittz indexed</small>
            </div>
          </div>
        )}

        <div className="explorer-controls">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label="Search by Pittz number"
            placeholder="Pittz number, e.g. 60"
            value={search}
            onChange={(event) => onSearchChange(event.target.value.replace(/[^0-9]/g,''))}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSearch();
            }}
          />

          <button
            className="btn primary explorer-search-button"
            type="button"
            onClick={onSearch}
          >
            Search
          </button>
        </div>

        <label className="explorer-rank-order">
          <span>Sort</span>
          <select aria-label="Sort or filter Explorer" value={rankOrder} onChange={(event)=>onRankOrderChange(event.target.value)}>
            <option value="rank-high-to-low">Rank High to Low</option>
            <option value="rank-low-to-high">Rank Low to High</option>
            <option value="type-core">Core</option>
            <option value="type-holo">Holo</option>
            <option value="type-legendary">Legendary</option>
          </select>
        </label>

      </div>

      <div className="pittz-results-bar">
        <span>
          Showing {shownCount} of {filteredCount.toLocaleString()} {activeCollection.name}
        </span>

        {filtersActive && (
          <button className="reset-filters" type="button" onClick={onReset}>
            ↻ Reset Filters
          </button>
        )}
      </div>
    </>
  );
}
