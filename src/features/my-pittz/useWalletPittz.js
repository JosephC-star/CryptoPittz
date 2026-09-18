import { useEffect, useState } from "react";

const PITTZ_COLLECTIONS = ["PITTZ-1a4c2d", "PITTZVICE-c3ec94"];

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

        const collections = PITTZ_COLLECTIONS.join(",");
        const response = await fetch(
          `https://api.multiversx.com/accounts/${address}/nfts?collections=${collections}&size=1000`,
          { signal: controller.signal },
        );

        if (!response.ok) throw new Error("Unable to load CryptoPittz NFTs");

        setNfts(await response.json());
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
