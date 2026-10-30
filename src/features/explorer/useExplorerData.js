import {readJson} from '../../utils/readJson.mjs';
import { useEffect, useRef, useState } from "react";

import { EXPLORER_COLLECTIONS } from "../../config/collections";

export default function useExplorerData(pageSize, { enabled = true } = {}) {
  const [retryTick,setRetryTick]=useState(0),[indexError,setIndexError]=useState('');
  const [collection, setCollection] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get("collection");
    return ["both", "vice"].includes(requested) ? requested : "original";
  });
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
  const searchController=useRef(null);
  const cacheRef = useRef({ original: null, vice: null });

  const activeCollection = collection === "both" ? { name: "Original + Vice Pittz", collection: "both" } : EXPLORER_COLLECTIONS[collection];
  const collectionIds = collection === "both" ? [EXPLORER_COLLECTIONS.original.collection, EXPLORER_COLLECTIONS.vice.collection] : [activeCollection.collection];

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    async function fetchCollectionPage() {
      try {
        setPageLoading(true);
        setPageError("");
        setPageNfts([]);

        // The grid paginates the full index; these rows establish page availability.
        const from = collection === "both" ? 0 : page * pageSize;
        const results = await Promise.all(collectionIds.map(async id => {
          const [nfts, count] = await Promise.all([
            readJson(`https://api.multiversx.com/collections/${id}/nfts?from=${from}&size=${pageSize}`, { signal: controller.signal }),
            readJson(`https://api.multiversx.com/collections/${id}/nfts/count`, { signal: controller.signal }),
          ]);
          if (!Array.isArray(nfts) || !Number.isSafeInteger(count) || count < 0) throw Error('Collection response was incomplete.');
          return { nfts, count };
        }));
        const nftData = results.flatMap(result => result.nfts);
        const totalCount = results.reduce((sum, result) => sum + result.count, 0);

        if(controller.signal.aborted)return;
        if(!Array.isArray(nftData)||!Number.isSafeInteger(totalCount)||totalCount<0)throw Error('Collection response was incomplete.');
        setPageNfts(nftData);
        setCollectionTotal(totalCount);
      } catch (error) {
        if (!controller.signal.aborted && error.name !== "AbortError") {
          console.error("Explorer lookup failed:", error);
          setPageError("The collection could not be loaded.");
        }
      } finally {
        if (!controller.signal.aborted) setPageLoading(false);
      }
    }

    fetchCollectionPage();
    return () => controller.abort();
  }, [enabled, activeCollection.collection, page, pageSize,retryTick]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let readyTimeout;
    const controller = new AbortController();
    setIndexError('');
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

        const counts = await Promise.all(collectionIds.map(id => readJson(
          `https://api.multiversx.com/collections/${id}/nfts/count`, { signal: controller.signal },
        )));
        if (counts.some(count => !Number.isSafeInteger(count) || count < 0)) throw Error('Collection count was incomplete.');
        const totalCount = counts.reduce((sum, count) => sum + count, 0);
        if (!cancelled) setLoadProgress({ loaded: 0, total: totalCount });
        const groups = collectionIds.map(() => []);
        await Promise.all(collectionIds.map(async (id, index) => {
          const cached = cacheRef.current[id];
          if (cached) {
            groups[index] = cached;
          } else {
            for (let from = 0; from < counts[index]; from += 100) {
              const rows = await readJson(`https://api.multiversx.com/collections/${id}/nfts?from=${from}&size=100`, { signal: controller.signal });
              if (!Array.isArray(rows)) throw Error('Collection response was incomplete.');
              groups[index].push(...rows);
              if (!cancelled) {
                const loaded = groups.flat();
                setAllNfts(loaded);
                setLoadProgress({ loaded: loaded.length, total: totalCount });
              }
            }
            if (!cancelled) cacheRef.current[id] = groups[index];
          }
        }));
        const indexedNfts = groups.flat();

        if (!cancelled) {
          cacheRef.current[cacheKey] = indexedNfts;
          setAllNfts(indexedNfts);
          setIndexReady(true);
          readyTimeout = setTimeout(() => setIndexReady(false), 1800);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Global Explorer dataset failed:", error);
          if(!cancelled)setIndexError('Some collection data could not load. Trait and filter results may be incomplete.');
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
  }, [enabled, activeCollection.collection, collection,retryTick]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchCollectionTotals() {
      try {
        const [originalResponse, viceResponse] = await Promise.all([
          readJson("https://api.multiversx.com/collections/PITTZ-1a4c2d/nfts/count", {
            signal: controller.signal,
          }),
          readJson("https://api.multiversx.com/collections/PITTZVICE-c3ec94/nfts/count", {
            signal: controller.signal,
          }),
        ]);

        const [originalCount, viceCount] = await Promise.all([
          originalResponse,
          viceResponse,
        ]);

        setOriginalTotal(originalCount);
        setViceTotal(viceCount);
      } catch (error) {
        if (error.name !== "AbortError") console.error("Collection totals failed:", error);
      }
    }

    fetchCollectionTotals();
    return () => controller.abort();
  }, [retryTick]);

  useEffect(()=>{clearSearch();return()=>searchController.current?.abort();},[activeCollection.collection]);

  function clearSearch() {
    searchController.current?.abort();
    setSearchLoading(false);
    setSearchResult(null);
    setSearchError("");
  }

  async function searchCryptoPittz(rawSearch) {
    const search = rawSearch.trim();

    if (!search) {
      clearSearch();
      return;
    }

    searchController.current?.abort();
    const controller=new AbortController();searchController.current=controller;
    try {
      setSearchLoading(true);
      setSearchError("");
      setSearchResult(null);

      const normalizedSearch = search.toLowerCase();
      const looksLikeFullIdentifier =
        normalizedSearch.startsWith("pittz-") || normalizedSearch.startsWith("pittzvice-");

      if (looksLikeFullIdentifier) {
        const response = await readJson(
          `https://api.multiversx.com/nfts/${encodeURIComponent(search)}`,{signal:controller.signal}
        );

        const nft = await response;if(controller.signal.aborted)return;
        if (!collectionIds.includes(nft.collection)) {
          setSearchError("That Pitt belongs to a different CryptoPittz collection.");
          return;
        }

        setSearchResult(nft);
        return;
      }

      const pittNumber = search.match(/\d+/)?.[0];
      const names = collectionIds.map(id => pittNumber
        ? `${id === EXPLORER_COLLECTIONS.vice.collection ? 'CryptoPittz VICE' : 'CryptoPittz'} #${pittNumber}`
        : search);
      const groups = await Promise.all(collectionIds.map((id, index) => readJson(
        `https://api.multiversx.com/collections/${id}/nfts?name=${encodeURIComponent(names[index])}&size=10`, { signal: controller.signal },
      )));
      if (controller.signal.aborted) return;
      if (groups.some(rows => !Array.isArray(rows))) throw Error('Search response was incomplete.');
      const data = groups.flat();
      if (!data.length) {
        setSearchError(`No ${activeCollection.name} matching that search was found.`);
        return;
      }

      const exactMatch =
        data.find((nft) => names.some(name => (nft.name || "").toLowerCase() === name.toLowerCase())) || data[0];

      setSearchResult(exactMatch);
    } catch (error) {
      if(controller.signal.aborted)return;
      console.error("CryptoPittz search failed:", error);
      setSearchError(error.status===404?"No Pittz with that identifier was found. Check the identifier or try a number or name.":"The collection search could not be completed. Please try again.");
    } finally {
      if(!controller.signal.aborted)setSearchLoading(false);
    }
  }

  return {
    activeCollection,
    allNfts,
    clearSearch,
    collection,
    collectionTotal,
    indexError,
    retry:()=>{cacheRef.current = {};setRetryTick(tick=>tick+1);},
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
