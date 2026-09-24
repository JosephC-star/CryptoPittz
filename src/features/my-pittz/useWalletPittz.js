import { useEffect, useState } from "react";

const PITTZ_COLLECTIONS = ["PITTZ-1a4c2d", "PITTZVICE-c3ec94"];
const PAGE_SIZE = 100;

async function fetchCollectionPage(address, collection, from, signal) {
  const params = new URLSearchParams({
    collections: collection,
    from: String(from),
    size: String(PAGE_SIZE),
  });
  const response = await fetch(
    `https://api.multiversx.com/accounts/${address}/nfts?${params}`,
    { signal },
  );

  if (!response.ok) throw new Error(`Unable to load ${collection} NFTs`);
  return response.json();
}

async function fetchAllWalletPittz(address, signal) {
  const collectionResults = await Promise.all(
    PITTZ_COLLECTIONS.map(async (collection) => {
      const pittz = [];

      for (let from = 0; ; from += PAGE_SIZE) {
        const page = await fetchCollectionPage(address, collection, from, signal);
        pittz.push(...page);
        if (page.length < PAGE_SIZE) break;
      }

      return pittz;
    }),
  );

  return collectionResults.flat();
}

export default function useWalletPittz(address) {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    if (!address) return () => controller.abort();

    async function fetchWalletPittz() {
      try {
        setLoading(true);
        setError("");

        setNfts(await fetchAllWalletPittz(address, controller.signal));
      } catch (fetchError) {
        if (fetchError.name !== "AbortError") {
          console.error("NFT lookup failed:", fetchError);
          setError("We couldn't load NFTs from this wallet.");
          setNfts([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchWalletPittz();
    return () => controller.abort();
  }, [address]);

  return {
    nfts: address ? nfts : [],
    loading: Boolean(address) && loading,
    error: address ? error : "",
  };
}
