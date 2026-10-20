import {readJson} from '../../utils/readJson.mjs';
import { useEffect, useRef, useState } from "react";

import { EXPLORER_COLLECTIONS } from "../../config/collections";

export default function useExplorerData(pageSize) {
  const [retryTick,setRetryTick]=useState(0),[indexError,setIndexError]=useState('');
  const [collection, setCollection] = useState(() => new URLSearchParams(window.location.search).get("collection") === "vice" ? "vice" : "original");
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

  const activeCollection = EXPLORER_COLLECTIONS[collection];

  useEffect(() => {
    const controller = new AbortController();

    async function fetchCollectionPage() {
      try {
        setPageLoading(true);
        setPageError("");
        setPageNfts([]);

        const from = page * pageSize;
        const [nftsResponse, countResponse] = await Promise.all([
          readJson(
            `https://api.multiversx.com/collections/${activeCollection.collection}/nfts?from=${from}&size=${pageSize}`,
            { signal: controller.signal },
          ),
          readJson(`https://api.multiversx.com/collections/${activeCollection.collection}/nfts/count`, {
            signal: controller.signal,
          }),
        ]);

        const [nftData, totalCount] = await Promise.all([
          nftsResponse,
          countResponse,
        ]);

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
  }, [activeCollection.collection, page, pageSize,retryTick]);

  useEffect(() => {
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

        const countResponse = await readJson(
          `https://api.multiversx.com/collections/${activeCollection.collection}/nfts/count`,
          { signal: controller.signal },
        );

        const totalCount = countResponse;
        if(!Number.isSafeInteger(totalCount)||totalCount<0)throw Error('Collection count was incomplete.');
        if (!cancelled) setLoadProgress({ loaded: 0, total: totalCount });

        const indexedNfts = [];

        for (let from = 0; from < totalCount; from += pageSize) {
          const response = await readJson(
            `https://api.multiversx.com/collections/${activeCollection.collection}/nfts?from=${from}&size=${pageSize}`,
            { signal: controller.signal },
          );

          indexedNfts.push(...(await response));

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
  }, [activeCollection.collection, collection, pageSize,retryTick]);

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

      const collectionId = activeCollection.collection;
      const normalizedSearch = search.toLowerCase();
      const looksLikeFullIdentifier =
        normalizedSearch.startsWith("pittz-") || normalizedSearch.startsWith("pittzvice-");

      if (looksLikeFullIdentifier) {
        const response = await readJson(
          `https://api.multiversx.com/nfts/${encodeURIComponent(search)}`,{signal:controller.signal}
        );

        const nft = await response;if(controller.signal.aborted)return;
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

      const response = await readJson(
        `https://api.multiversx.com/collections/${collectionId}/nfts?name=${encodeURIComponent(
          searchName,
        )}&size=10`,{signal:controller.signal}
      );

      const data = await response;if(controller.signal.aborted)return;
      if(!Array.isArray(data))throw Error('Search response was incomplete.');
      if (!data.length) {
        setSearchError(`No ${activeCollection.name} matching that search was found.`);
        return;
      }

      const exactMatch =
        data.find((nft) => (nft.name || "").toLowerCase() === searchName.toLowerCase()) || data[0];

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
    retry:()=>{cacheRef.current[collection]=null;setRetryTick(tick=>tick+1);},
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
