import { useEffect, useMemo, useState } from "react";

import { identifyListingMarkets } from "../../utils/listingMarketplace";

export default function useOoxListings(collection) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadListings() {
      try {
        setLoading(true);
        setError("");
        setListings([]);

        const ids = collection === 'both' ? ['PITTZ-1a4c2d', 'PITTZVICE-c3ec94'] : [collection];
        const data = await Promise.all(ids.map(async id => {
          const response = await fetch(`/.netlify/functions/oox-listings?collection=${encodeURIComponent(id)}`, { signal: controller.signal });
          if (!response.ok) throw new Error("Unable to load OOX listings");
          return response.json();
        }));
        if (controller.signal.aborted) return;
        const rows = data.flatMap(result => Array.isArray(result.listings) ? result.listings : []);
        setListings(rows);
        const identified = await identifyListingMarkets(rows, controller.signal);
        if (!controller.signal.aborted) setListings(identified);
        setUpdatedAt(data[0]?.updatedAt || "");
      } catch (loadError) {
        if (loadError.name === "AbortError") return;
        console.error("OOX listing lookup failed:", loadError);
        setError("OOX listing status is temporarily unavailable.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    if (collection) loadListings();
    return () => controller.abort();
  }, [collection]);

  const listingMap = useMemo(
    () => new Map(listings.map((listing) => [listing.identifier, listing])),
    [listings],
  );

  return { listings, listingMap, loading, error, updatedAt };
}
