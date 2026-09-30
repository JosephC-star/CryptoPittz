import { useEffect, useState } from "react";

const PITTZ_COLLECTIONS = ["PITTZ-1a4c2d", "PITTZVICE-c3ec94"];
const PAGE_SIZE = 100;

async function fetchWalletPage(address, from, signal, collection = "") {
  const params = new URLSearchParams({
    from: String(from),
    size: String(PAGE_SIZE),
  });
  if (collection) params.set("collections", collection);
  const response = await fetch(
    `https://api.multiversx.com/accounts/${address}/nfts?${params}`,
    { signal },
  );

  if (!response.ok) throw new Error(`Unable to load wallet NFTs (${response.status})`);
  return response.json();
}

async function fetchFilteredWalletPittz(address, signal) {
  const collectionResults = await Promise.all(
    PITTZ_COLLECTIONS.map(async (collection) => {
      const pittz = [];

      for (let from = 0; ; from += PAGE_SIZE) {
        const page = await fetchWalletPage(address, from, signal, collection);
        pittz.push(...page);
        if (page.length < PAGE_SIZE) break;
      }

      return pittz;
    }),
  );

  return collectionResults.flat();
}

async function fetchUnfilteredWalletPittz(address, signal) {
  const walletNfts = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const page = await fetchWalletPage(address, from, signal);
    walletNfts.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return walletNfts.filter((nft) => PITTZ_COLLECTIONS.includes(nft.collection));
}

async function fetchAllWalletPittz(address, signal) {
  try {
    return await fetchFilteredWalletPittz(address, signal);
  } catch (filteredError) {
    if (filteredError.name === "AbortError") throw filteredError;
    console.warn("Filtered NFT lookup failed; retrying the full wallet.", filteredError);
    return fetchUnfilteredWalletPittz(address, signal);
  }
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
