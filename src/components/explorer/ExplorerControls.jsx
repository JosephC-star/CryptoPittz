export default function ExplorerControls({
  activeCollection,
  collectionTotal,
  indexLoading,
  indexReady,
  loadProgress,
  search,
  onSearchChange,
  onSearch,
  sort,
  onSortChange,
  bloodline,
  bloodlines,
  onBloodlineChange,
  type,
  onTypeChange,
  shownCount,
  filteredCount,
  onReset,
}) {
  const filtersActive = search || bloodline !== "all" || type !== "all" || sort !== "rank";
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
          <strong>{activeCollection.collection}</strong>
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

            <small>Preparing collection-wide rank, score, bloodline, and type filters.</small>
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
            placeholder="Search CryptoPittz name or ID..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
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

        <select value={sort} onChange={(event) => onSortChange(event.target.value)}>
          <option value="rank">Best Rank</option>
          <option value="score">Highest Score</option>
          <option value="name">Name</option>
        </select>

        <select value={bloodline} onChange={(event) => onBloodlineChange(event.target.value)}>
          <option value="all">All Bloodlines</option>
          {bloodlines.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select value={type} onChange={(event) => onTypeChange(event.target.value)}>
          <option value="all">All Types</option>
          <option value="Core">Core</option>
          <option value="Secret">Secret</option>
          <option value="Holo">Holo</option>
          <option value="Legendary">Legendary</option>
        </select>
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
