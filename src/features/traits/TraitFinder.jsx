import { useMemo, useState } from "react";

import { getPittzTraits } from "../../utils/nftUtils";
import "./TraitFinder.css";

function TraitFinder({ nfts, loading, selected, onSelectedChange }) {
  const [traitSearch, setTraitSearch] = useState("");
  const [expanded, setExpanded] = useState(false);

  const catalog = useMemo(() => {
    const categories = new Map();
    nfts.forEach((nft) => {
      getPittzTraits(nft.attributes).forEach(({ trait, value }) => {
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
  }, [nfts]);

  const activeFilters = Object.entries(selected).flatMap(([trait, values]) =>
    values.map((value) => ({ trait, value })),
  );
  const normalizedSearch = traitSearch.trim().toLowerCase();

  function toggleTrait(trait, value) {
    const currentValues = selected[trait] || [];
    const nextValues = currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value];
    const next = { ...selected };
    if (nextValues.length) next[trait] = nextValues;
    else delete next[trait];
    onSelectedChange(next);
  }

  function clearTraits() {
    setTraitSearch("");
    onSelectedChange({});
  }

  return (
    <div id="traits" className={`explorer-trait-finder ${expanded ? "open" : ""}`}>
      <button
        className="trait-finder-toggle"
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        <span><b>🔎 PittzStop Trait Finder</b><small>Combine traits to filter this Explorer grid</small></span>
        <span className="trait-toggle-meta">
          {activeFilters.length > 0 && <strong>{activeFilters.length} active</strong>}
          <i aria-hidden="true">⌄</i>
        </span>
      </button>

      {activeFilters.length > 0 && (
        <div className="active-trait-chips compact">
          {activeFilters.map(({ trait, value }) => (
            <button type="button" onClick={() => toggleTrait(trait, value)} key={`${trait}-${value}`}>
              <small>{trait}</small>{value} ×
            </button>
          ))}
          <button className="clear-trait-chip" type="button" onClick={clearTraits}>Clear all</button>
        </div>
      )}

      {expanded && (
        <div className="trait-finder-body">
          <div className="trait-finder-intro">
            <div><span>PITTZSTOP INDEX</span><strong>{catalog.length} trait categories</strong></div>
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

          <div className="trait-category-grid">
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
        </div>
      )}
    </div>
  );
}

export default TraitFinder;
