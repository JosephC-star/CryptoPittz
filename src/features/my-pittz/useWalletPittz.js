import {readJson} from '../../utils/readJson.mjs';
import { useEffect, useState } from "react";

const PITTZ_COLLECTIONS = ["PITTZ-1a4c2d", "PITTZVICE-c3ec94"];
const PAGE_SIZE = 100;

async function fetchWalletPage(address, from, signal, collection = "") {
  const params = new URLSearchParams({
    from: String(from),
    size: String(PAGE_SIZE),
  });
  if (collection) params.set("collections", collection);
  const data=await readJson(`https://api.multiversx.com/accounts/${address}/nfts?${params}`,{signal});
  if(!Array.isArray(data))throw Error('Wallet response was not a list.');
  return data;
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
  const [retryTick,setRetryTick]=useState(0),[loadedAddress,setLoadedAddress]=useState('');
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    setNfts([]);setError('');setLoadedAddress(address||'');
    if (!address){setLoading(false);return () => controller.abort();}

    async function fetchWalletPittz() {
      try {
        setLoading(true);
        setError("");

        const found=await fetchAllWalletPittz(address, controller.signal);
        if(!controller.signal.aborted)setNfts(found);
      } catch (fetchError) {
        if (!controller.signal.aborted && fetchError.name !== "AbortError") {
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
  }, [address,retryTick]);

  return {
    nfts: address&&loadedAddress===address ? nfts : [],
    loading: Boolean(address) && (loadedAddress!==address||loading),
    error: address&&loadedAddress===address ? error : "",
    retry:()=>setRetryTick(tick=>tick+1),
  };
}
