import { useEffect, useMemo, useState } from "react";

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

        const response = await fetch(
          `/.netlify/functions/oox-listings?collection=${encodeURIComponent(collection)}`,
          { signal: controller.signal },
        );

        if (!response.ok) throw new Error("Unable to load OOX listings");

        const data = await response.json();
        setListings(Array.isArray(data.listings) ? data.listings : []);
        setUpdatedAt(data.updatedAt || "");
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
