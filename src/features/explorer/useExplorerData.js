import { useEffect, useRef, useState } from "react";

import { EXPLORER_COLLECTIONS } from "../../config/collections";

export default function useExplorerData(pageSize) {
  const [collection, setCollection] = useState("original");
  const [page, setPage] = useState(0);
  const [pageNfts, setPageNfts] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [allNfts, setAllNfts] = useState([]);
  const [indexLoading, setIndexLoading] = useState(false);
  const [indexReady, setIndexReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ loaded: 0, total: 0 });
  const [collectionTotal, setCollectionTotal] = useState(0);
  const [originalTotal, setOriginalTotal] = useState(0);
  const [viceTotal, setViceTotal] = useState(0);
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const cacheRef = useRef({ original: null, vice: null });

  const activeCollection = EXPLORER_COLLECTIONS[collection];

  useEffect(() => {
    const controller = new AbortController();

    async function fetchCollectionPage() {
      try {
        setPageLoading(true);
        setPageError("");

        const from = page * pageSize;
        const [nftsResponse, countResponse] = await Promise.all([
          fetch(
            `https://api.multiversx.com/collections/${activeCollection.collection}/nfts?from=${from}&size=${pageSize}`,
            { signal: controller.signal },
          ),
          fetch(`https://api.multiversx.com/collections/${activeCollection.collection}/nfts/count`, {
            signal: controller.signal,
          }),
        ]);

        if (!nftsResponse.ok || !countResponse.ok) {
          throw new Error("Unable to load collection");
        }

        const [nftData, totalCount] = await Promise.all([
          nftsResponse.json(),
          countResponse.json(),
        ]);

        setPageNfts(nftData);
        setCollectionTotal(totalCount);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Explorer lookup failed:", error);
          setPageError("The collection could not be loaded.");
        }
      } finally {
        if (!controller.signal.aborted) setPageLoading(false);
      }
    }

    fetchCollectionPage();
    return () => controller.abort();
  }, [activeCollection.collection, page, pageSize]);

  useEffect(() => {
    let cancelled = false;
    let readyTimeout;
    const controller = new AbortController();
    const cacheKey = collection;
    const cachedCollection = cacheRef.current[cacheKey];

    if (cachedCollection) {
      setAllNfts(cachedCollection);
      setIndexLoading(false);
      setLoadProgress({ loaded: cachedCollection.length, total: cachedCollection.length });
      return () => controller.abort();
    }

    async function buildCollectionIndex() {
      try {
        setIndexLoading(true);
        setAllNfts([]);
        setIndexReady(false);
        setLoadProgress({ loaded: 0, total: 0 });

        const countResponse = await fetch(
          `https://api.multiversx.com/collections/${activeCollection.collection}/nfts/count`,
          { signal: controller.signal },
        );

        if (!countResponse.ok) throw new Error("Unable to load collection count");

        const totalCount = await countResponse.json();
        if (!cancelled) setLoadProgress({ loaded: 0, total: totalCount });

        const indexedNfts = [];

        for (let from = 0; from < totalCount; from += pageSize) {
          const response = await fetch(
            `https://api.multiversx.com/collections/${activeCollection.collection}/nfts?from=${from}&size=${pageSize}`,
            { signal: controller.signal },
          );

          if (!response.ok) {
            throw new Error(`Unable to load collection page starting at ${from}`);
          }

          indexedNfts.push(...(await response.json()));

          if (!cancelled) {
            setAllNfts([...indexedNfts]);
            setLoadProgress({ loaded: indexedNfts.length, total: totalCount });
          }
        }

        if (!cancelled) {
          cacheRef.current[cacheKey] = indexedNfts;
          setAllNfts(indexedNfts);
          setIndexReady(true);
          readyTimeout = setTimeout(() => setIndexReady(false), 1800);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Global Explorer dataset failed:", error);
        }
      } finally {
        if (!cancelled) setIndexLoading(false);
      }
    }

    buildCollectionIndex();

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(readyTimeout);
    };
  }, [activeCollection.collection, collection, pageSize]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchCollectionTotals() {
      try {
        const [originalResponse, viceResponse] = await Promise.all([
          fetch("https://api.multiversx.com/collections/PITTZ-1a4c2d/nfts/count", {
            signal: controller.signal,
          }),
          fetch("https://api.multiversx.com/collections/PITTZVICE-c3ec94/nfts/count", {
            signal: controller.signal,
          }),
        ]);

        if (!originalResponse.ok || !viceResponse.ok) {
          throw new Error("Unable to load collection totals");
        }

        const [originalCount, viceCount] = await Promise.all([
          originalResponse.json(),
          viceResponse.json(),
        ]);

        setOriginalTotal(originalCount);
        setViceTotal(viceCount);
      } catch (error) {
        if (error.name !== "AbortError") console.error("Collection totals failed:", error);
      }
    }

    fetchCollectionTotals();
    return () => controller.abort();
  }, []);

  function clearSearch() {
    setSearchResult(null);
    setSearchError("");
  }

  async function searchCryptoPittz(rawSearch) {
    const search = rawSearch.trim();

    if (!search) {
      clearSearch();
      return;
    }

    try {
      setSearchLoading(true);
      setSearchError("");
      setSearchResult(null);

      const collectionId = activeCollection.collection;
      const normalizedSearch = search.toLowerCase();
      const looksLikeFullIdentifier =
        normalizedSearch.startsWith("pittz-") || normalizedSearch.startsWith("pittzvice-");

      if (looksLikeFullIdentifier) {
        const response = await fetch(
          `https://api.multiversx.com/nfts/${encodeURIComponent(search)}`,
        );

        if (!response.ok) throw new Error("NFT not found");

        const nft = await response.json();
        if (nft.collection !== collectionId) {
          setSearchError("That Pitt belongs to a different CryptoPittz collection.");
          return;
        }

        setSearchResult(nft);
        return;
      }

      const pittNumber = search.match(/\d+/)?.[0];
      const searchName = pittNumber
        ? collection === "vice"
          ? `CryptoPittz VICE #${pittNumber}`
          : `CryptoPittz #${pittNumber}`
        : search;

      const response = await fetch(
        `https://api.multiversx.com/collections/${collectionId}/nfts?name=${encodeURIComponent(
          searchName,
        )}&size=10`,
      );

      if (!response.ok) throw new Error("Unable to search CryptoPittz");

      const data = await response.json();
      if (!data.length) {
        setSearchError(`No ${activeCollection.name} matching that search was found.`);
        return;
      }

      const exactMatch =
        data.find((nft) => (nft.name || "").toLowerCase() === searchName.toLowerCase()) || data[0];

      setSearchResult(exactMatch);
    } catch (error) {
      console.error("CryptoPittz search failed:", error);
      setSearchError("The collection search could not be completed.");
    } finally {
      setSearchLoading(false);
    }
  }

  return {
    activeCollection,
    allNfts,
    clearSearch,
    collection,
    collectionTotal,
    indexLoading,
    indexReady,
    loadProgress,
    originalTotal,
    page,
    pageError,
    pageLoading,
    pageNfts,
    searchCryptoPittz,
    searchError,
    searchLoading,
    searchResult,
    setCollection,
    setPage,
    viceTotal,
  };
}
