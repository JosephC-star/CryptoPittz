import { useEffect, useRef, useState } from "react";
import "./App.css";

import { UnlockPanelManager } from "@multiversx/sdk-dapp/out/managers/UnlockPanelManager";
import { useGetAccount } from "@multiversx/sdk-dapp/out/react/account/useGetAccount";
import { getAccountProvider } from "@multiversx/sdk-dapp/out/providers/helpers/accountProvider";

import { ProviderFactory } from "@multiversx/sdk-dapp/out/providers/ProviderFactory";
import { ProviderTypeEnum } from "@multiversx/sdk-dapp/out/providers/types/providerFactory.types";

import GallerySection from "./components/gallery/GallerySection";
import ExplorerPagination from "./components/explorer/ExplorerPagination";
import NftCard from "./components/nft/NftCard";
import NftDetailModal from "./components/nft/NftDetailModal";
import {
  BONEZ_DEXSCREENER_URL,
  BONEZ_TOKEN_ID,
  EXPLORER_COLLECTIONS,
} from "./config/collections";
import { BONEZ_RATES } from "./config/bonezRates";
import { buildBonezChart } from "./utils/chartUtils";
import { formatBonezUsd, formatMarketNumber } from "./utils/formatters";
import { getPittzStats } from "./utils/nftUtils";

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState(null);
  const [nfts, setNfts] = useState([]);
  const [nftsLoading, setNftsLoading] = useState(false);
  const [nftsError, setNftsError] = useState("");
  const [selectedNft, setSelectedNft] = useState(null);
  const [modalNfts, setModalNfts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("rank");
  const [bloodlineFilter, setBloodlineFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [explorerNfts, setExplorerNfts] = useState([]);
  const [explorerLoading, setExplorerLoading] = useState(true);
  const [explorerError, setExplorerError] = useState("");
  const [explorerSearch, setExplorerSearch] = useState("");
  const [explorerSort, setExplorerSort] = useState("rank");
  const [explorerBloodline, setExplorerBloodline] = useState("all");
  const [explorerType, setExplorerType] = useState("all");
  const [explorerAllNfts, setExplorerAllNfts] = useState([]);
  const [explorerAllLoading, setExplorerAllLoading] = useState(false);
  const [explorerLoadProgress, setExplorerLoadProgress] = useState({
    loaded: 0,
    total: 0,
  });
  const [explorerTotal, setExplorerTotal] = useState(0);
  const [explorerPage, setExplorerPage] = useState(0);
  const [explorerCache, setExplorerCache] = useState({
    original: null,
    vice: null,
  });
  const [globalSearchResult, setGlobalSearchResult] = useState(null);
  const [explorerIndexReady, setExplorerIndexReady] = useState(false);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [globalSearchError, setGlobalSearchError] = useState("");
  const [randomPittLoading, setRandomPittLoading] = useState(false);
  const [randomPittError, setRandomPittError] = useState("");
  const [explorerCollection, setExplorerCollection] = useState("original");
  const [originalTotal, setOriginalTotal] = useState(0);
  const [viceTotal, setViceTotal] = useState(0);
  const [randomPittMode, setRandomPittMode] = useState("surprise");
  const [myPittzCollection, setMyPittzCollection] = useState("original");
  const walletConnectAnchorRef = useRef(null);
  const [walletOverlayOpen, setWalletOverlayOpen] = useState(false);

  const [mobileWalletConnecting, setMobileWalletConnecting] = useState(false);
  const [mobileWalletError, setMobileWalletError] = useState("");

  const EXPLORER_PAGE_SIZE = 100;

  const account = useGetAccount();
  const [bonezMarket, setBonezMarket] = useState(null);
  const [bonezMarketLoading, setBonezMarketLoading] = useState(true);
  const [bonezMarketError, setBonezMarketError] = useState("");
  const [bonezMarketUpdated, setBonezMarketUpdated] = useState(null);
  const [bonezPriceHistory, setBonezPriceHistory] = useState([]);
  const [bonezChartLoading, setBonezChartLoading] = useState(true);
  const [bonezChartError, setBonezChartError] = useState("");
  const [bonezDailyHistory, setBonezDailyHistory] = useState([]);
  const [bonezChartRange, setBonezChartRange] = useState("24h");

  const unlockPanelManager = UnlockPanelManager.init({
    loginHandler: () => {
      console.log("Wallet connected!");
    },
  });
  const activeCollection = EXPLORER_COLLECTIONS[explorerCollection];
  const ownedOriginalPittz = nfts.filter((nft) => nft.collection === "PITTZ-1a4c2d");

  const ownedVicePittz = nfts.filter((nft) => nft.collection === "PITTZVICE-c3ec94");
  const activeOwnedPittz = myPittzCollection === "vice" ? ownedVicePittz : ownedOriginalPittz;
  function getBonezTier(nft) {
    const stats = getPittzStats(nft.attributes);
    const rank = Number(stats.rank);

    if (!rank) return null;

    const isVice = nft.collection === "PITTZVICE-c3ec94";

    if (!isVice) {
      if (rank === 1) return "Secret Rare";
      if (rank === 2) return "Holoz";
      if (rank === 3) return "Lego";
      if (rank >= 4 && rank <= 451) return "Platinum";
      if (rank >= 452 && rank <= 1245) return "Gold";
      if (rank >= 1246 && rank <= 3195) return "Silver";
      if (rank >= 3196 && rank <= 6999) return "Bronze";

      return null;
    }

    if (rank === 1) return "Secret Rare";
    if (rank === 2) return "Holoz";
    if (rank === 3) return "Lego";
    if (rank >= 4 && rank <= 104) return "Platinum";
    if (rank >= 105 && rank <= 288) return "Gold";
    if (rank >= 289 && rank <= 701) return "Silver";
    if (rank >= 702 && rank <= 1337) return "Bronze";

    return null;
  }

  function getBonezGeneration(nft) {
    const tier = getBonezTier(nft);

    if (!tier) {
      return null;
    }

    const collectionType = nft.collection === "PITTZVICE-c3ec94" ? "vice" : "original";

    const rates = BONEZ_RATES[collectionType][tier];

    if (!rates) {
      return null;
    }

    return {
      tier,
      daily: rates.daily,
      weekly: rates.weekly,
      monthly: rates.daily * 30,
    };
  }

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  function toggleMobileGroup(group) {
    setMobileGroup((current) => (current === group ? null : group));
  }
  function isMobileDevice() {
    return window.matchMedia("(max-width: 700px)").matches;
  }

  async function connectWallet() {
    if (!isMobileDevice()) {
      void UnlockPanelManager.getInstance().openUnlockPanel();
      return;
    }

    setMobileOpen(false);

    if (!walletConnectAnchorRef.current) {
      setMobileWalletError("Wallet connection area is not ready yet.");
      return;
    }

    try {
      setMobileWalletConnecting(true);
      setMobileWalletError("");
      setWalletOverlayOpen(true);

      const provider = await ProviderFactory.create({
        type: ProviderTypeEnum.walletConnect,
        anchor: walletConnectAnchorRef.current,
      });

      await provider.login();

      if (walletConnectAnchorRef.current) {
        walletConnectAnchorRef.current.replaceChildren();
      }

      setWalletOverlayOpen(false);
    } catch (error) {
      console.error("xPortal mobile connection failed:", error);

      setMobileWalletError(
        error instanceof Error ? error.message : "Unable to connect with xPortal.",
      );
    } finally {
      setMobileWalletConnecting(false);
    }
  }

  function openNftDetails(nft, nftList = [nft]) {
    setSelectedNft(nft);
    setModalNfts(nftList);
  }

  function closeNftDetails() {
    setSelectedNft(null);
    setModalNfts([]);
  }

  function showPreviousNft() {
    if (!selectedNft || modalNfts.length <= 1) return;

    const currentIndex = modalNfts.findIndex((nft) => nft.identifier === selectedNft.identifier);

    if (currentIndex === -1) return;

    const previousIndex = currentIndex === 0 ? modalNfts.length - 1 : currentIndex - 1;

    setSelectedNft(modalNfts[previousIndex]);
  }

  function showNextNft() {
    if (!selectedNft || modalNfts.length <= 1) return;

    const currentIndex = modalNfts.findIndex((nft) => nft.identifier === selectedNft.identifier);

    if (currentIndex === -1) return;

    const nextIndex = currentIndex === modalNfts.length - 1 ? 0 : currentIndex + 1;

    setSelectedNft(modalNfts[nextIndex]);
  }

  async function disconnectWallet() {
    const provider = getAccountProvider();
    await provider.logout();
  }

  async function showRandomPitt() {
    try {
      setRandomPittLoading(true);
      setRandomPittError("");

      let collectionId;
      let total;

      if (randomPittMode === "original") {
        collectionId = "PITTZ-1a4c2d";
        total = originalTotal || 5310;
      } else if (randomPittMode === "vice") {
        collectionId = "PITTZVICE-c3ec94";
        total = viceTotal || 1395;
      } else {
        const chooseVice = Math.random() < 0.5;

        collectionId = chooseVice ? "PITTZVICE-c3ec94" : "PITTZ-1a4c2d";

        total = chooseVice ? viceTotal || 1395 : originalTotal || 5310;
      }

      const randomIndex = Math.floor(Math.random() * total);

      const response = await fetch(
        `https://api.multiversx.com/collections/${collectionId}/nfts?from=${randomIndex}&size=1`,
      );

      if (!response.ok) {
        throw new Error("Unable to load random CryptoPitt");
      }

      const data = await response.json();

      if (!data.length) {
        throw new Error("No CryptoPitt found");
      }

      openNftDetails(data[0], [data[0]]);
    } catch (error) {
      console.error("Random Pitt lookup failed:", error);

      setRandomPittError("Couldn't summon a random Pitt. Try again!");
    } finally {
      setRandomPittLoading(false);
    }
  }

  async function searchCryptoPittz() {
    const search = explorerSearch.trim();

    if (!search) {
      setGlobalSearchResult(null);
      setGlobalSearchError("");
      return;
    }

    try {
      setGlobalSearchLoading(true);
      setGlobalSearchError("");
      setGlobalSearchResult(null);

      /*
      Use whichever Explorer collection tab is currently active.
      Original:
        PITTZ-1a4c2d

      Vice:
        PITTZVICE-c3ec94
    */
      const collectionId = activeCollection.collection;

      const normalizedSearch = search.toLowerCase();

      /*
      If somebody pasted the complete NFT identifier,
      use MultiversX's direct NFT endpoint.
    */
      const looksLikeFullIdentifier =
        normalizedSearch.startsWith("pittz-") || normalizedSearch.startsWith("pittzvice-");

      if (looksLikeFullIdentifier) {
        const response = await fetch(
          `https://api.multiversx.com/nfts/${encodeURIComponent(search)}`,
        );

        if (!response.ok) {
          throw new Error("NFT not found");
        }

        const nft = await response.json();

        if (nft.collection !== collectionId) {
          setGlobalSearchError(`That Pitt belongs to a different CryptoPittz collection.`);
          return;
        }

        setGlobalSearchResult(nft);
        return;
      }

      /*
      Pull the visible Pitt number out of searches such as:

      4809
      #4809
      Pittz #4809
      CryptoPittz #4809
    */
      const pittNumber = search.match(/\d+/)?.[0];

      let searchName = search;

      if (pittNumber) {
        searchName =
          explorerCollection === "vice"
            ? `CryptoPittz VICE #${pittNumber}`
            : `CryptoPittz #${pittNumber}`;
      }

      const response = await fetch(
        `https://api.multiversx.com/collections/${collectionId}/nfts?name=${encodeURIComponent(
          searchName,
        )}&size=10`,
      );

      if (!response.ok) {
        throw new Error("Unable to search CryptoPittz");
      }

      const data = await response.json();

      if (!data.length) {
        setGlobalSearchError(`No ${activeCollection.name} matching that search was found.`);
        return;
      }

      /*
      Prefer the exact displayed number/name when possible.
    */
      const exactMatch =
        data.find((nft) => (nft.name || "").toLowerCase() === searchName.toLowerCase()) || data[0];

      setGlobalSearchResult(exactMatch);
    } catch (error) {
      console.error("CryptoPittz search failed:", error);

      setGlobalSearchError("The collection search could not be completed.");
    } finally {
      setGlobalSearchLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchBonezDailyHistory() {
      try {
        const response = await fetch(
          `https://api.multiversx.com/mex/tokens/prices/daily/${BONEZ_TOKEN_ID}`,
        );

        if (!response.ok) {
          throw new Error("Unable to load BONEZ daily history");
        }

        const data = await response.json();

        if (!cancelled) {
          setBonezDailyHistory(data);
        }
      } catch (error) {
        console.error("BONEZ daily history failed:", error);
      }
    }

    fetchBonezDailyHistory();

    const interval = setInterval(fetchBonezDailyHistory, 1_800_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    async function fetchWalletNfts() {
      if (!account.address) {
        setNfts([]);
        return;
      }

      try {
        setNftsLoading(true);
        setNftsError("");

        const collections = ["PITTZ-1a4c2d", "PITTZVICE-c3ec94"].join(",");

        const response = await fetch(
          `https://api.multiversx.com/accounts/${account.address}/nfts?collections=${collections}&size=1000`,
        );

        if (!response.ok) {
          throw new Error("Unable to load CryptoPittz NFTs");
        }

        const data = await response.json();

        console.log("CryptoPittz NFTs:", data);

        setNfts(data);
      } catch (error) {
        console.error("NFT lookup failed:", error);
        setNftsError("We couldn't load NFTs from this wallet.");
        setNfts([]);
      } finally {
        setNftsLoading(false);
      }
    }

    fetchWalletNfts();
  }, [account.address]);

  const walletSummary = (() => {
    if (!nfts.length) {
      return {
        total: 0,
        bestRank: null,
        highestScore: null,
        bloodlines: {},
        types: {},
      };
    }

    const summaries = nfts.map((nft) => getPittzStats(nft.attributes));

    const ranks = summaries
      .map((item) => Number(item.rank))
      .filter((value) => Number.isFinite(value) && value > 0);

    const scores = summaries
      .map((item) => Number(item.score))
      .filter((value) => Number.isFinite(value));

    const bloodlines = {};
    const types = {};

    summaries.forEach((item) => {
      if (item.bloodline) {
        bloodlines[item.bloodline] = (bloodlines[item.bloodline] || 0) + 1;
      }

      if (item.type) {
        types[item.type] = (types[item.type] || 0) + 1;
      }
    });

    return {
      total: nfts.length,
      bestRank: ranks.length ? Math.min(...ranks) : null,
      highestScore: scores.length ? Math.max(...scores) : null,
      bloodlines,
      types,
    };
  })();

  const filteredNfts = activeOwnedPittz
    .filter((nft) => {
      const stats = getPittzStats(nft.attributes);

      const matchesSearch =
        nft.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nft.identifier?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesBloodline = bloodlineFilter === "all" || stats.bloodline === bloodlineFilter;

      const matchesType = typeFilter === "all" || stats.type === typeFilter;

      return matchesSearch && matchesBloodline && matchesType;
    })
    .sort((a, b) => {
      const aStats = getPittzStats(a.attributes);
      const bStats = getPittzStats(b.attributes);

      if (sortBy === "rank") {
        return Number(aStats.rank || Infinity) - Number(bStats.rank || Infinity);
      }

      if (sortBy === "score") {
        return Number(bStats.score || 0) - Number(aStats.score || 0);
      }

      if (sortBy === "name") {
        return (a.name || "").localeCompare(b.name || "");
      }

      return 0;
    });

  useEffect(() => {
    async function fetchCollection() {
      try {
        setExplorerLoading(true);
        setExplorerError("");

        const from = explorerPage * EXPLORER_PAGE_SIZE;

        const [nftsResponse, countResponse] = await Promise.all([
          fetch(
            `https://api.multiversx.com/collections/${activeCollection.collection}/nfts?from=${from}&size=${EXPLORER_PAGE_SIZE}`,
          ),

          fetch(`https://api.multiversx.com/collections/${activeCollection.collection}/nfts/count`),
        ]);

        if (!nftsResponse.ok || !countResponse.ok) {
          throw new Error("Unable to load collection");
        }

        const nftData = await nftsResponse.json();

        const totalCount = await countResponse.json();
        console.log("First Vice NFT:", nftData[0]);
        console.log("Vice media:", nftData[0]?.media);
        console.log("Vice URIs:", nftData[0]?.uris);

        setExplorerNfts(nftData);
        setExplorerTotal(totalCount);
      } catch (error) {
        console.error("Explorer lookup failed:", error);

        setExplorerError("The collection could not be loaded.");
      } finally {
        setExplorerLoading(false);
      }
    }

    fetchCollection();
  }, [explorerPage, activeCollection.collection]);

  useEffect(() => {
    let cancelled = false;

    async function fetchAllCollectionNfts() {
      const cacheKey = activeCollection.collection === "PITTZVICE-c3ec94" ? "vice" : "original";

      const cachedCollection = explorerCache[cacheKey];

      if (cachedCollection) {
        setExplorerAllNfts(cachedCollection);
        setExplorerAllLoading(false);

        setExplorerLoadProgress({
          loaded: cachedCollection.length,
          total: cachedCollection.length,
        });

        return;
      }

      try {
        setExplorerAllLoading(true);
        setExplorerAllNfts([]);
        setExplorerIndexReady(false);

        setExplorerLoadProgress({
          loaded: 0,
          total: 0,
        });

        const countResponse = await fetch(
          `https://api.multiversx.com/collections/${activeCollection.collection}/nfts/count`,
        );

        if (!countResponse.ok) {
          throw new Error("Unable to load collection count");
        }

        const totalCount = await countResponse.json();

        if (!cancelled) {
          setExplorerLoadProgress({
            loaded: 0,
            total: totalCount,
          });
        }

        const allNfts = [];

        for (let from = 0; from < totalCount; from += EXPLORER_PAGE_SIZE) {
          const response = await fetch(
            `https://api.multiversx.com/collections/${activeCollection.collection}/nfts?from=${from}&size=${EXPLORER_PAGE_SIZE}`,
          );

          if (!response.ok) {
            throw new Error(`Unable to load collection page starting at ${from}`);
          }

          const pageData = await response.json();

          allNfts.push(...pageData);

          if (!cancelled) {
            setExplorerLoadProgress({
              loaded: allNfts.length,
              total: totalCount,
            });
          }
        }

        if (!cancelled) {
          setExplorerAllNfts(allNfts);

          setExplorerCache((current) => ({
            ...current,
            [cacheKey]: allNfts,
          }));
          setExplorerIndexReady(true);

          setTimeout(() => {
            setExplorerIndexReady(false);
          }, 1800);
        }
      } catch (error) {
        console.error("Global Explorer dataset failed:", error);
      } finally {
        if (!cancelled) {
          setExplorerAllLoading(false);
        }
      }
    }

    fetchAllCollectionNfts();

    return () => {
      cancelled = true;
    };
  }, [activeCollection.collection]);

  useEffect(() => {
    setExplorerPage(0);

    setExplorerSearch("");
    setExplorerBloodline("all");
    setExplorerType("all");

    setGlobalSearchResult(null);
    setGlobalSearchError("");
  }, [explorerCollection]);

  useEffect(() => {
    setExplorerPage(0);
  }, [explorerBloodline, explorerType, explorerSort]);

  useEffect(() => {
    async function fetchCollectionTotals() {
      try {
        const [originalResponse, viceResponse] = await Promise.all([
          fetch("https://api.multiversx.com/collections/PITTZ-1a4c2d/nfts/count"),
          fetch("https://api.multiversx.com/collections/PITTZVICE-c3ec94/nfts/count"),
        ]);

        if (!originalResponse.ok || !viceResponse.ok) {
          throw new Error("Unable to load collection totals");
        }

        const originalCount = await originalResponse.json();
        const viceCount = await viceResponse.json();

        setOriginalTotal(originalCount);
        setViceTotal(viceCount);
      } catch (error) {
        console.error("Collection totals failed:", error);
      }
    }

    fetchCollectionTotals();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchBonezMarket() {
      try {
        setBonezMarketError("");

        const response = await fetch(BONEZ_DEXSCREENER_URL);

        if (!response.ok) {
          throw new Error("Unable to load BONEZ market data");
        }

        const data = await response.json();
        const pair = data.pair || data.pairs?.[0];

        if (!pair) {
          throw new Error("BONEZ market pair was not found");
        }

        if (!cancelled) {
          setBonezMarket(pair);
          setBonezMarketUpdated(new Date());
        }
      } catch (error) {
        console.error("BONEZ market lookup failed:", error);

        if (!cancelled) {
          setBonezMarketError("Live BONEZ market data is temporarily unavailable.");
        }
      } finally {
        if (!cancelled) {
          setBonezMarketLoading(false);
        }
      }
    }

    fetchBonezMarket();

    const interval = setInterval(fetchBonezMarket, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchBonezPriceHistory() {
      try {
        setBonezChartError("");

        const response = await fetch(
          `https://api.multiversx.com/mex/tokens/prices/hourly/${BONEZ_TOKEN_ID}`,
        );

        if (!response.ok) {
          throw new Error("Unable to load BONEZ price history");
        }

        const data = await response.json();

        if (!cancelled) {
          setBonezPriceHistory(data);
        }
      } catch (error) {
        console.error("BONEZ price history failed:", error);

        if (!cancelled) {
          setBonezChartError("BONEZ chart data is temporarily unavailable.");
        }
      } finally {
        if (!cancelled) {
          setBonezChartLoading(false);
        }
      }
    }

    fetchBonezPriceHistory();

    const interval = setInterval(fetchBonezPriceHistory, 300_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const bonezWalletTotals = nfts.reduce(
    (totals, nft) => {
      const bonez = getBonezGeneration(nft);

      if (!bonez) return totals;

      totals.daily += bonez.daily;
      totals.weekly += bonez.weekly;
      totals.monthly += bonez.monthly;
      totals.pittz += 1;

      return totals;
    },
    {
      daily: 0,
      weekly: 0,
      monthly: 0,
      pittz: 0,
    },
  );

  const activeBonezHistory =
    bonezChartRange === "24h"
      ? bonezPriceHistory.slice(-24)
      : bonezChartRange === "7d"
        ? bonezDailyHistory.slice(-7)
        : bonezDailyHistory.slice(-30);

  const bonezChart = buildBonezChart(activeBonezHistory);

  const bonezChartChange =
    bonezChart?.first?.value && bonezChart?.last?.value
      ? ((bonezChart.last.value - bonezChart.first.value) / bonezChart.first.value) * 100
      : null;

  const explorerSummary = (() => {
    const bloodlines = {};
    const types = {};

    explorerNfts.forEach((nft) => {
      const stats = getPittzStats(nft.attributes);

      if (stats.bloodline) {
        bloodlines[stats.bloodline] = (bloodlines[stats.bloodline] || 0) + 1;
      }

      if (stats.type) {
        types[stats.type] = (types[stats.type] || 0) + 1;
      }
    });

    return {
      bloodlines,
      types,
    };
  })();

  const bonezLiveUsdPrice = Number(bonezMarket?.priceUsd);

  const bonezWalletUsdValues = {
    daily: Number.isFinite(bonezLiveUsdPrice) ? bonezWalletTotals.daily * bonezLiveUsdPrice : null,

    weekly: Number.isFinite(bonezLiveUsdPrice)
      ? bonezWalletTotals.weekly * bonezLiveUsdPrice
      : null,

    monthly: Number.isFinite(bonezLiveUsdPrice)
      ? bonezWalletTotals.monthly * bonezLiveUsdPrice
      : null,
  };

  const filteredExplorerNfts = explorerAllNfts
    .filter((nft) => {
      const stats = getPittzStats(nft.attributes);

      const matchesSearch =
        nft.name?.toLowerCase().includes(explorerSearch.toLowerCase()) ||
        nft.identifier?.toLowerCase().includes(explorerSearch.toLowerCase());

      const matchesBloodline = explorerBloodline === "all" || stats.bloodline === explorerBloodline;

      const matchesType = explorerType === "all" || stats.type === explorerType;

      return matchesSearch && matchesBloodline && matchesType;
    })
    .sort((a, b) => {
      const aStats = getPittzStats(a.attributes);
      const bStats = getPittzStats(b.attributes);

      if (explorerSort === "rank") {
        return Number(aStats.rank || Infinity) - Number(bStats.rank || Infinity);
      }

      if (explorerSort === "score") {
        return Number(bStats.score || 0) - Number(aStats.score || 0);
      }

      if (explorerSort === "name") {
        return (a.name || "").localeCompare(b.name || "");
      }

      return 0;
    });

  const explorerFilteredTotal = filteredExplorerNfts.length;

  const explorerPageNfts = filteredExplorerNfts.slice(
    explorerPage * EXPLORER_PAGE_SIZE,
    explorerPage * EXPLORER_PAGE_SIZE + EXPLORER_PAGE_SIZE,
  );

  return (
    <>
      <div className="blob b1"></div>
      <div className="blob b2"></div>
      <div className="blob b3"></div>

      <header>
        <div className="container">
          <div className="nav">
            <a className="brand" href="#top" aria-label="CryptoPittz Home">
              <div className="logo logo-image" aria-hidden="true">
                <img src="/images/cryptopittz-bonez.jpg" alt="" />
              </div>

              <div>
                <img
                  className="random-pitt-wordmark"
                  src="/images/cryptopittz-wordmark.png"
                  alt="CryptoPittz"
                />
                <span className="tag">Neon collectibles • Community • Future utility</span>
              </div>
            </a>

            <nav className="nav-links" aria-label="Primary navigation">
              <div className="nav-item">
                <div className="nav-btn" role="button" tabIndex="0" aria-haspopup="true">
                  About <span className="caret" aria-hidden="true"></span>
                </div>
                <div className="dropdown" role="menu">
                  <a href="#gallery">Featured Pittz</a>
                  <a href="#my-pittz">My Pittz</a>
                  <a href="#explorer">CryptoPittz Explorer</a>
                  <a href="#traits">Traits</a>
                  <a href="#rarity">Rarity</a>
                </div>
              </div>

              <div className="nav-item">
                <div className="nav-btn" role="button" tabIndex="0" aria-haspopup="true">
                  Gallery <span className="caret" aria-hidden="true"></span>
                </div>

                <div className="dropdown" role="menu">
                  <a href="#gallery">Featured</a>
                  <a href="#traits">Traits (Soon)</a>
                  <a href="#rarity">Rarity (Soon)</a>
                </div>
              </div>

              <div className="nav-item">
                <div className="nav-btn" role="button" tabIndex="0" aria-haspopup="true">
                  Ecosystem <span className="caret" aria-hidden="true"></span>
                </div>

                <div className="dropdown" role="menu">
                  <a href="#join">CryptoPittz Ecosystem</a>

                  <a href="https://discord.gg/PP8S8DX9t" target="_blank" rel="noreferrer">
                    Discord ↗
                  </a>

                  <a
                    href="https://www.oox.art/marketplace/collections/PITTZ-1a4c2d"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Marketplace ↗
                  </a>

                  <a
                    href="https://xexchange.com/trade?firstToken=EGLD&secondToken=BONEZ-ff9a73"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Swap BONEZ ↗
                  </a>

                  <a
                    href="https://taostats.io/account/5ChwfAKs7YEHX6QNJub6DYzKhP47bxjkVdFCh3ndX6vXYMa7/transactions"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Pittensor / TaoStats ↗
                  </a>

                  <a
                    href="https://xportal.app.link/referral?code=xdsu8lsipv"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Get xPortal ↗
                  </a>
                </div>
              </div>

              {account.address ? (
                <div className="wallet-area">
                  <div className="wallet-status">
                    <span className="wallet-dot"></span>

                    <div>
                      <small>Connected</small>

                      <strong>
                        {account.address.slice(0, 6)}...
                        {account.address.slice(-4)}
                      </strong>
                    </div>
                  </div>

                  <button
                    className="btn"
                    type="button"
                    onClick={() => navigator.clipboard.writeText(account.address)}
                  >
                    Copy
                  </button>

                  <button
                    className="btn wallet-disconnect"
                    type="button"
                    onClick={disconnectWallet}
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  className="btn primary"
                  type="button"
                  onClick={connectWallet}
                  disabled={mobileWalletConnecting}
                >
                  {mobileWalletConnecting ? "Opening xPortal..." : "Connect Wallet"}
                </button>
              )}
            </nav>

            <button
              className="hamburger"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((current) => !current)}
            >
              <span aria-hidden="true"></span>
            </button>
          </div>

          <div
            className={`mobile-panel ${mobileOpen ? "open" : ""}`}
            aria-label="Mobile navigation"
          >
            <div className={`mobile-group ${mobileGroup === "about" ? "open" : ""}`}>
              <button
                className="mobile-toggle"
                type="button"
                onClick={() => toggleMobileGroup("about")}
              >
                About <span className="caret"></span>
              </button>

              <div className="mobile-links">
                <a href="#gallery" onClick={closeMobileMenu}>
                  Featured Pittz
                </a>

                <a href="#my-pittz" onClick={closeMobileMenu}>
                  My Pittz
                </a>

                <a href="#explorer" onClick={closeMobileMenu}>
                  CryptoPittz Explorer
                </a>

                <a href="#traits" onClick={closeMobileMenu}>
                  Traits
                </a>

                <a href="#rarity" onClick={closeMobileMenu}>
                  Rarity
                </a>
              </div>
            </div>

            <div className={`mobile-group ${mobileGroup === "gallery" ? "open" : ""}`}>
              <button
                className="mobile-toggle"
                type="button"
                onClick={() => toggleMobileGroup("gallery")}
              >
                Gallery <span className="caret"></span>
              </button>

              <div className="mobile-links">
                <a href="#gallery" onClick={closeMobileMenu}>
                  Featured
                </a>

                <a href="#traits" onClick={closeMobileMenu}>
                  Traits (Soon)
                </a>

                <a href="#rarity" onClick={closeMobileMenu}>
                  Rarity (Soon)
                </a>
              </div>
            </div>

            <div className={`mobile-group ${mobileGroup === "ecosystem" ? "open" : ""}`}>
              <button
                className="mobile-toggle"
                type="button"
                onClick={() => toggleMobileGroup("ecosystem")}
              >
                Ecosystem <span className="caret"></span>
              </button>

              <div className="mobile-links">
                <a href="#join" onClick={closeMobileMenu}>
                  CryptoPittz Ecosystem
                </a>

                <a
                  href="https://discord.gg/PP8S8DX9t"
                  target="_blank"
                  rel="noreferrer"
                  onClick={closeMobileMenu}
                >
                  Discord ↗
                </a>

                <a
                  href="https://www.oox.art/marketplace/collections/PITTZ-1a4c2d"
                  target="_blank"
                  rel="noreferrer"
                  onClick={closeMobileMenu}
                >
                  Marketplace ↗
                </a>

                <a
                  href="https://xexchange.com/trade?firstToken=EGLD&secondToken=BONEZ-ff9a73"
                  target="_blank"
                  rel="noreferrer"
                  onClick={closeMobileMenu}
                >
                  Swap BONEZ ↗
                </a>

                <a
                  href="https://taostats.io/account/5ChwfAKs7YEHX6QNJub6DYzKhP47bxjkVdFCh3ndX6vXYMa7/transactions"
                  target="_blank"
                  rel="noreferrer"
                  onClick={closeMobileMenu}
                >
                  Pittensor / TaoStats ↗
                </a>

                <a
                  href="https://xportal.app.link/referral?code=xdsu8lsipv"
                  target="_blank"
                  rel="noreferrer"
                  onClick={closeMobileMenu}
                >
                  Get xPortal ↗
                </a>
              </div>
            </div>

            <div className="mobile-links mobile-direct-links">
              <a href="#contact" onClick={closeMobileMenu}>
                Contact
              </a>
            </div>

            {account.address ? (
              <div className="mobile-wallet-area">
                <div className="wallet-status">
                  <span className="wallet-dot"></span>

                  <div>
                    <small>Connected</small>

                    <strong>
                      {account.address.slice(0, 6)}...
                      {account.address.slice(-4)}
                    </strong>
                  </div>
                </div>

                <div className="mobile-wallet-actions">
                  <button
                    className="btn"
                    type="button"
                    onClick={() => navigator.clipboard.writeText(account.address)}
                  >
                    Copy
                  </button>

                  <button
                    className="btn wallet-disconnect"
                    type="button"
                    onClick={disconnectWallet}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn primary mobile-connect-wallet"
                type="button"
                onClick={connectWallet}
                disabled={mobileWalletConnecting}
              >
                {mobileWalletConnecting ? "Opening xPortal..." : "Connect Wallet"}
              </button>
            )}

            {mobileWalletError && <p className="wallet-error">{mobileWalletError}</p>}

            <div style={{ marginTop: "12px" }}>
              <a
                className="btn primary"
                href="#join"
                style={{ width: "100%" }}
                onClick={closeMobileMenu}
              >
                Get Involved
              </a>
            </div>
          </div>
        </div>
      </header>

      <main id="top">
        <div className="container">
          <div className="hero">
            <div className="panel hero-copy-panel">
              <div className="hero-cosmic-bg" aria-hidden="true" />

              <div className="hero-cosmic-nebula" aria-hidden="true" />

              <div className="hero-pitbull-wrap" aria-hidden="true">
                <img src="/images/neon-pitbull-hero.png" alt="" className="hero-pitbull-art" />
              </div>

              <div className="inner">
                <div className="badge">⚡ Welcome to the CryptoPittz universe</div>

                <h2 className="title">CryptoPittz is a neon-charged collectible universe.</h2>

                <p className="subtitle">
                  CryptoPittz is an NFT collection on MultiversX, featuring raw, high-quality
                  pitbull artwork. the collection has two drops: the original Pittz consisting of
                  5310 art pieces released in to wild back in 2021 and the 2nd collection, Vice
                  Pittz, consisting of only 1395 retro themed nfts. Both collections feature
                  references from pop culture, and possess a free-spirited, gritty, degen vibe. Hold
                  your Pittz in your wallet and earn $BONEZ automatically every Sunday. No staking,
                  just pure passive accumulation. Every month the team uses 75% of the profits from
                  the Pittensor fund, on Bittensor, to buy back and burn the $BONEZ. the remaining
                  25% gets compounded back into the Pettensor fund, crushing supply and building
                  long-term value. You Earn, We Burn! We are a tight crew of degens who love art,
                  the memes, and the culture. Merch and pet products on the horizon. Woof Woof!
                </p>

                <div className="chip-row">
                  <div className="chip">🎨 Art-first vibe</div>
                  <div className="chip">🧩 Utility-ready</div>
                  <div className="chip">🧠 Built to expand</div>
                  <div className="chip">📱 Mobile-friendly</div>
                </div>

                <div
                  className="hero-actions"
                  style={{
                    display: "flex",
                    gap: "12px",
                    flexWrap: "wrap",
                    marginTop: "18px",
                  }}
                >
                  <a className="btn primary" href="#about">
                    Explore the Project
                  </a>

                  <a className="btn" href="#gallery">
                    See the Pittz
                  </a>
                </div>
              </div>
            </div>

            <div className="panel hero-art">
              <div className="mock" aria-label="CryptoPittz artwork preview">
                <div className="label">
                  <img
                    className="random-pitt-wordmark"
                    src="/images/cryptopittz-wordmark.png"
                    alt="CryptoPittz"
                  />
                  <span style={{ opacity: 0.8 }}>Welcome to the Pack</span>
                </div>

                <div className="random-pitt-hero">
                  <div className="random-pitt-icon">🎲</div>

                  <div className="random-pitt-copy">
                    <span>Feeling Lucky?</span>

                    <strong>Meet a Random Pitt</strong>

                    <p>
                      Discover one from all{" "}
                      {explorerTotal ? explorerTotal.toLocaleString() : "5,310"} CryptoPittz.
                    </p>
                  </div>
                  <div className="random-pitt-modes">
                    <button
                      type="button"
                      className={randomPittMode === "original" ? "active" : ""}
                      onClick={() => setRandomPittMode("original")}
                    >
                      Original
                    </button>

                    <button
                      type="button"
                      className={randomPittMode === "vice" ? "active" : ""}
                      onClick={() => setRandomPittMode("vice")}
                    >
                      Vice
                    </button>

                    <button
                      type="button"
                      className={randomPittMode === "surprise" ? "active" : ""}
                      onClick={() => setRandomPittMode("surprise")}
                    >
                      Surprise Me
                    </button>
                  </div>

                  <button
                    className="btn primary random-pitt-button"
                    type="button"
                    onClick={showRandomPitt}
                    disabled={randomPittLoading}
                  >
                    {randomPittLoading ? "Finding a Pitt..." : "🎲 Random Pitt"}
                  </button>
                </div>
              </div>
              <div className="pittz-network">
                <div className="pittz-network-header">
                  <div>
                    <span className="pittz-network-eyebrow">Network Status</span>
                    <h3>PITTZ NETWORK</h3>
                  </div>

                  <div className="pittz-network-live">
                    <span className="pittz-network-dot" />
                    Online
                  </div>
                </div>

                <div className="pittz-network-grid">
                  <div className="pittz-network-stat cyan">
                    <span>Original Pittz</span>
                    <strong>{originalTotal?.toLocaleString() || "5,310"}</strong>
                  </div>

                  <div className="pittz-network-stat magenta">
                    <span>Vice Pittz</span>
                    <strong>{viceTotal?.toLocaleString() || "1,395"}</strong>
                  </div>
                </div>

                <div className="pittz-network-status">
                  <div>
                    <span>Explorer Index</span>
                    <strong>READY</strong>
                  </div>

                  <div>
                    <span>BONEZ Utility</span>
                    <strong>ACTIVE</strong>
                  </div>

                  <div>
                    <span>Randomizer</span>
                    <strong>ONLINE</strong>
                  </div>
                </div>

                <div className="pittz-network-scan" />
              </div>
              {randomPittError && <div className="random-pitt-error">{randomPittError}</div>}
            </div>
          </div>

          <div className="grid" aria-label="Highlights">
            <div className="card">
              <div className="accent"></div>

              <div className="inner">
                <h3>Mission</h3>
                <p>
                  Build a recognizable collection centered around art, community and future utility.
                </p>
              </div>
            </div>

            <div className="card">
              <div className="accent"></div>

              <div className="inner">
                <h3>Collection</h3>
                <p>Explore the growing world of unique CryptoPittz characters and traits.</p>
              </div>
            </div>

            <div className="card">
              <div className="accent"></div>

              <div className="inner">
                <h3>Community</h3>
                <p>Connect with the pack as CryptoPittz continues to grow.</p>
              </div>
            </div>
          </div>

          <section id="about">
            <div className="section-title">
              <h2>About CryptoPittz</h2>
              <span>Meet the pack.</span>
            </div>

            <div className="panel">
              <div className="inner">
                <p className="subtitle" style={{ maxWidth: "80ch" }}>
                  CryptoPittz is a stylized NFT project featuring bold neon palettes, heavy outlines
                  and playful traits. The project is designed to grow into a connected experience
                  with wallet integration, holder features, collection tools and more.
                </p>

                <div className="grid" style={{ marginTop: "18px" }}>
                  <div className="card" style={{ gridColumn: "span 6" }}>
                    <div className="accent"></div>

                    <div className="inner">
                      <h3>What makes it different?</h3>
                      <p>
                        Distinctive characters, colorful artwork and a visual identity designed to
                        immediately stand out.
                      </p>
                    </div>
                  </div>

                  <div className="card" style={{ gridColumn: "span 6" }}>
                    <div className="accent"></div>

                    <div className="inner">
                      <h3>Where is it going?</h3>
                      <p>
                        Wallet connectivity, NFT ownership features and an expanding CryptoPittz
                        community experience.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="roadmap">
            <div className="section-title">
              <h2>Roadmap</h2>
              <span>The journey begins.</span>
            </div>

            <div className="grid">
              <div className="card" style={{ gridColumn: "span 4" }}>
                <div className="accent"></div>

                <div className="inner">
                  <h3>Phase 1</h3>
                  <p>Website foundation, artwork and community presence.</p>
                </div>
              </div>

              <div className="card" style={{ gridColumn: "span 4" }}>
                <div className="accent"></div>

                <div className="inner">
                  <h3>Phase 2</h3>
                  <p>MultiversX wallet integration and holder identification.</p>
                </div>
              </div>

              <div className="card" style={{ gridColumn: "span 4" }}>
                <div className="accent"></div>

                <div className="inner">
                  <h3>Phase 3</h3>
                  <p>Expanded utility, NFT tools and future community features.</p>
                </div>
              </div>
            </div>
          </section>

          <div className="section-title">
            <span>🦴 Live Utility</span>
            <h2>BONEZ Market</h2>
            <p>Live market data for the token powering the CryptoPittz ecosystem.</p>
          </div>

          <div className="bonez-market">
            <div className="bonez-market-header">
              <div>
                <span className="bonez-market-eyebrow">🦴 Live Market</span>

                <h3>BONEZ MARKET</h3>

                <p>BONEZ / EGLD • xExchange</p>
              </div>

              <div className={`bonez-market-status ${bonezMarket ? "online" : ""}`}>
                <span className="bonez-market-dot" />
                {bonezMarketLoading ? "Loading" : bonezMarket ? "Live" : "Offline"}
              </div>
            </div>

            {bonezMarketLoading && !bonezMarket && (
              <div className="bonez-market-loading">Connecting to BONEZ market data...</div>
            )}

            {bonezMarketError && !bonezMarket && (
              <div className="bonez-market-error">{bonezMarketError}</div>
            )}

            {bonezMarket && (
              <>
                <div className="bonez-market-price">
                  <span>Current BONEZ Price</span>

                  <strong>{formatBonezUsd(bonezMarket.priceUsd)}</strong>

                  <small>
                    1 BONEZ ={" "}
                    {Number(bonezMarket.priceNative).toLocaleString("en-US", {
                      minimumFractionDigits: 8,
                      maximumFractionDigits: 8,
                    })}{" "}
                    EGLD
                  </small>
                </div>

                <div className="bonez-chart">
                  <div className="bonez-chart-header">
                    <div>
                      <span>Price History</span>

                      <strong>
                        {bonezChartRange === "24h"
                          ? "24H BONEZ / USD"
                          : bonezChartRange === "7d"
                            ? "7D BONEZ / USD"
                            : "30D BONEZ / USD"}
                      </strong>
                    </div>

                    <div className="bonez-chart-ranges">
                      <button
                        type="button"
                        className={bonezChartRange === "24h" ? "active" : ""}
                        onClick={() => setBonezChartRange("24h")}
                      >
                        24H
                      </button>

                      <button
                        type="button"
                        className={bonezChartRange === "7d" ? "active" : ""}
                        onClick={() => setBonezChartRange("7d")}
                      >
                        7D
                      </button>

                      <button
                        type="button"
                        className={bonezChartRange === "30d" ? "active" : ""}
                        onClick={() => setBonezChartRange("30d")}
                      >
                        30D
                      </button>
                    </div>

                    <div
                      className={`bonez-chart-change ${
                        bonezChartChange > 0 ? "positive" : bonezChartChange < 0 ? "negative" : ""
                      }`}
                    >
                      {bonezChartChange !== null
                        ? `${bonezChartChange >= 0 ? "+" : ""}${bonezChartChange.toFixed(2)}%`
                        : "—"}
                    </div>
                  </div>

                  {bonezChartLoading && !bonezChart && (
                    <div className="bonez-chart-placeholder">Loading BONEZ price history...</div>
                  )}

                  {bonezChartError && !bonezChart && (
                    <div className="bonez-chart-placeholder">{bonezChartError}</div>
                  )}

                  {bonezChart && (
                    <>
                      <div className="bonez-chart-stage">
                        <svg
                          viewBox={`0 0 ${bonezChart.width} ${bonezChart.height}`}
                          role="img"
                          aria-label="BONEZ 24 hour price chart"
                        >
                          <defs>
                            <linearGradient id="bonezChartGradient" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#ff3df7" />
                              <stop offset="50%" stopColor="#ffd86b" />
                              <stop offset="100%" stopColor="#00e5ff" />
                            </linearGradient>

                            <filter id="bonezChartGlow">
                              <feGaussianBlur stdDeviation="4" result="coloredBlur" />

                              <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                              </feMerge>
                            </filter>
                          </defs>

                          <line x1="18" x2="782" y1="55" y2="55" className="bonez-chart-gridline" />

                          <line
                            x1="18"
                            x2="782"
                            y1="110"
                            y2="110"
                            className="bonez-chart-gridline"
                          />

                          <line
                            x1="18"
                            x2="782"
                            y1="165"
                            y2="165"
                            className="bonez-chart-gridline"
                          />

                          <polyline
                            points={bonezChart.polyline}
                            fill="none"
                            stroke="url(#bonezChartGradient)"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            filter="url(#bonezChartGlow)"
                          />

                          <circle
                            cx={bonezChart.last.x}
                            cy={bonezChart.last.y}
                            r="6"
                            className="bonez-chart-current-dot"
                          />
                        </svg>
                      </div>

                      <div className="bonez-chart-footer">
                        <span>
                          Low <strong>${bonezChart.min.toFixed(7)}</strong>
                        </span>

                        <span>
                          High <strong>${bonezChart.max.toFixed(7)}</strong>
                        </span>

                        <span>
                          Current <strong>${bonezChart.last.value.toFixed(7)}</strong>
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="bonez-market-grid">
                  <div className="bonez-market-stat">
                    <span>24H Change</span>

                    <strong>
                      {bonezMarket.priceChange?.h24 !== undefined
                        ? `${Number(bonezMarket.priceChange.h24).toFixed(2)}%`
                        : "—"}
                    </strong>
                  </div>

                  <div className="bonez-market-stat">
                    <span>24H Volume</span>

                    <strong>{formatBonezUsd(bonezMarket.volume?.h24)}</strong>
                  </div>

                  <div className="bonez-market-stat">
                    <span>Liquidity</span>

                    <strong>{formatBonezUsd(bonezMarket.liquidity?.usd)}</strong>
                  </div>

                  <div className="bonez-market-stat">
                    <span>Market Cap</span>

                    <strong>{formatBonezUsd(bonezMarket.marketCap)}</strong>
                  </div>
                </div>

                <div className="bonez-market-activity">
                  <div>
                    <span>24H Buys</span>
                    <strong>{formatMarketNumber(bonezMarket.txns?.h24?.buys)}</strong>
                  </div>

                  <div>
                    <span>24H Sells</span>
                    <strong>{formatMarketNumber(bonezMarket.txns?.h24?.sells)}</strong>
                  </div>

                  <div>
                    <span>Pair</span>
                    <strong>BONEZ / EGLD</strong>
                  </div>
                </div>

                <div className="bonez-market-footer">
                  <div>
                    <span>Last updated</span>

                    <strong>
                      {bonezMarketUpdated
                        ? bonezMarketUpdated.toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                            second: "2-digit",
                          })
                        : "—"}
                    </strong>
                  </div>

                  {bonezMarket.url && (
                    <a
                      className="btn bonez-market-link"
                      href={bonezMarket.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View Live Market ↗
                    </a>
                  )}
                </div>
              </>
            )}
          </div>

          <section id="my-pittz">
            <div className="section-title">
              <h2>My Pittz</h2>
              <span>Your CryptoPittz collection.</span>
            </div>
            <div className="explorer-tabs my-pittz-tabs">
              <button
                type="button"
                className={`explorer-tab ${myPittzCollection === "original" ? "active" : ""}`}
                onClick={() => setMyPittzCollection("original")}
              >
                Original Pittz
                <span>{ownedOriginalPittz.length}</span>
              </button>

              <button
                type="button"
                className={`explorer-tab ${myPittzCollection === "vice" ? "active" : ""}`}
                onClick={() => setMyPittzCollection("vice")}
              >
                Vice Pittz
                <span>{ownedVicePittz.length}</span>
              </button>
            </div>

            <div className="panel">
              <div className="inner">
                {!account.address && (
                  <p className="subtitle">Connect your wallet to see your NFTs.</p>
                )}

                {account.address && nftsLoading && (
                  <p className="subtitle">Searching your wallet...</p>
                )}

                {account.address && nftsError && <p className="subtitle">{nftsError}</p>}

                {account.address && !nftsLoading && !nftsError && nfts.length === 0 && (
                  <p className="subtitle">No NFTs were found in this wallet.</p>
                )}

                {account.address && !nftsLoading && !nftsError && nfts.length > 0 && (
                  <>
                    <p className="subtitle">
                      You own {nfts.length} CryptoPittz NFT{nfts.length === 1 ? "" : "s"}.
                    </p>
                    <div className="wallet-summary">
                      <div className="wallet-summary-main">
                        <div className="wallet-summary-card">
                          <span>CryptoPittz Owned</span>
                          <strong>{walletSummary.total}</strong>
                        </div>

                        <div className="wallet-summary-card">
                          <span>Best Rank</span>
                          <strong>
                            {walletSummary.bestRank ? `#${walletSummary.bestRank}` : "—"}
                          </strong>
                        </div>

                        <div className="wallet-summary-card">
                          <span>Highest Score</span>
                          <strong>{walletSummary.highestScore ?? "—"}</strong>
                        </div>
                      </div>

                      <div className="wallet-summary-breakdown">
                        <div className="summary-group">
                          <span className="summary-title">Bloodlines</span>

                          <div className="summary-chips">
                            {Object.entries(walletSummary.bloodlines).map(([bloodline, count]) => (
                              <div className="summary-chip" key={bloodline}>
                                <strong>{bloodline}</strong>
                                <span>{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="summary-group">
                          <span className="summary-title">Types</span>

                          <div className="summary-chips">
                            {Object.entries(walletSummary.types).map(([type, count]) => (
                              <div className="summary-chip" key={type}>
                                <strong>{type}</strong>
                                <span>{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {account.address && !nftsLoading && !nftsError && nfts.length > 0 && (
                      <div className="bonez-wallet-total">
                        <div className="bonez-wallet-total-heading">
                          <div>
                            <span className="bonez-wallet-eyebrow">🦴 Wallet Utility</span>

                            <h3>Potential BONEZ Generation</h3>

                            <p>
                              Estimated potential based on your owned Pittz and their tier rates.
                            </p>
                          </div>

                          <div className="bonez-wallet-count">
                            <strong>{bonezWalletTotals.pittz}</strong>
                            <span>Pittz</span>
                          </div>
                        </div>

                        <div className="bonez-wallet-total-grid">
                          <div className="bonez-wallet-total-stat">
                            <span>Daily</span>

                            <strong>{bonezWalletTotals.daily.toFixed(2)}</strong>

                            <small>BONEZ</small>

                            <small>
                              {bonezWalletUsdValues.daily !== null
                                ? `≈ ${formatBonezUsd(bonezWalletUsdValues.daily)}`
                                : "Live price unavailable"}
                            </small>
                          </div>

                          <div className="bonez-wallet-total-stat">
                            <span>Weekly</span>

                            <strong>{bonezWalletTotals.weekly.toFixed(2)}</strong>

                            <small>BONEZ</small>

                            <small>
                              {bonezWalletUsdValues.weekly !== null
                                ? `≈ ${formatBonezUsd(bonezWalletUsdValues.weekly)}`
                                : "Live price unavailable"}
                            </small>
                          </div>

                          <div className="bonez-wallet-total-stat">
                            <span>Estimated 30 Days</span>

                            <strong>{bonezWalletTotals.monthly.toFixed(2)}</strong>

                            <small>BONEZ</small>

                            <small>
                              {bonezWalletUsdValues.monthly !== null
                                ? `≈ ${formatBonezUsd(bonezWalletUsdValues.monthly)}`
                                : "Live price unavailable"}
                            </small>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="pittz-controls">
                      <input
                        type="text"
                        placeholder="Search Pittz..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                      />

                      <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                        <option value="rank">Best Rank</option>
                        <option value="score">Highest Score</option>
                        <option value="name">Name</option>
                      </select>

                      <select
                        value={bloodlineFilter}
                        onChange={(event) => setBloodlineFilter(event.target.value)}
                      >
                        <option value="all">All Bloodlines</option>

                        {Object.keys(walletSummary.bloodlines).map((bloodline) => (
                          <option key={bloodline} value={bloodline}>
                            {bloodline}
                          </option>
                        ))}
                      </select>

                      <select
                        value={typeFilter}
                        onChange={(event) => setTypeFilter(event.target.value)}
                      >
                        <option value="all">All Types</option>

                        {Object.keys(walletSummary.types).map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="pittz-results-bar">
                      <span>
                        Showing {filteredNfts.length} of {activeOwnedPittz.length}{" "}
                        {myPittzCollection === "vice" ? "Vice Pittz" : "Original Pittz"}
                      </span>

                      {(searchTerm ||
                        bloodlineFilter !== "all" ||
                        typeFilter !== "all" ||
                        sortBy !== "rank") && (
                        <button
                          className="reset-filters"
                          type="button"
                          onClick={() => {
                            setSearchTerm("");
                            setSortBy("rank");
                            setBloodlineFilter("all");
                            setTypeFilter("all");
                          }}
                        >
                          ↻ Reset Filters
                        </button>
                      )}
                    </div>
                    <div className="wallet-nft-grid">
                      {filteredNfts.map((nft) => (
                        <NftCard
                          key={nft.identifier}
                          nft={nft}
                          bonez={getBonezGeneration(nft)}
                          isOwned
                          showTraits
                          onClick={() => openNftDetails(nft, filteredNfts)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          <section id="explorer">
            <div className="section-title">
              <h2>CryptoPittz Explorer</h2>
              <span>Browse the collection. No wallet required.</span>
            </div>

            <div className="explorer-tabs">
              <button
                type="button"
                className={`explorer-tab ${explorerCollection === "original" ? "active" : ""}`}
                onClick={() => setExplorerCollection("original")}
              >
                Original Pittz
                <span>{originalTotal ? originalTotal.toLocaleString() : "..."}</span>
              </button>

              <button
                type="button"
                className={`explorer-tab ${explorerCollection === "vice" ? "active" : ""}`}
                onClick={() => setExplorerCollection("vice")}
              >
                Vice Pittz
                <span>{viceTotal ? viceTotal.toLocaleString() : "..."}</span>
              </button>
            </div>

            <div className="panel">
              <div className="inner">
                {explorerLoading && (
                  <p className="subtitle">Loading the CryptoPittz collection...</p>
                )}

                {explorerError && <p className="subtitle">{explorerError}</p>}

                {!explorerLoading && !explorerError && explorerNfts.length > 0 && (
                  <>
                    <div className="explorer-header">
                      <div>
                        <span>Collection</span>
                        <strong>
                          {explorerTotal.toLocaleString()} {activeCollection.name}
                        </strong>
                      </div>

                      <div>
                        <span>Collection ID</span>
                        <strong>{activeCollection.collection}</strong>
                      </div>

                      {explorerAllLoading && (
                        <div className="explorer-index-status">
                          <div className="explorer-index-status-top">
                            <span>Building Explorer Index</span>

                            <strong>
                              {explorerLoadProgress.loaded.toLocaleString()} /{" "}
                              {explorerLoadProgress.total.toLocaleString()}
                            </strong>
                          </div>

                          <div className="explorer-index-progress">
                            <div
                              className="explorer-index-progress-bar"
                              style={{
                                width:
                                  explorerLoadProgress.total > 0
                                    ? `${Math.min(
                                        100,
                                        (explorerLoadProgress.loaded / explorerLoadProgress.total) *
                                          100,
                                      )}%`
                                    : "0%",
                              }}
                            />
                          </div>

                          <small>
                            Preparing collection-wide rank, score, bloodline, and type filters.
                          </small>
                        </div>
                      )}

                      {explorerIndexReady && (
                        <div className="explorer-index-ready">
                          <span>✓</span>

                          <div>
                            <strong>Explorer Index Ready</strong>
                            <small>
                              {explorerLoadProgress.total.toLocaleString()} Pittz indexed
                            </small>
                          </div>
                        </div>
                      )}

                      <div className="explorer-controls">
                        <input
                          type="text"
                          placeholder="Search CryptoPittz name or ID..."
                          value={explorerSearch}
                          onChange={(event) => {
                            setExplorerSearch(event.target.value);
                            setGlobalSearchResult(null);
                            setGlobalSearchError("");
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              searchCryptoPittz();
                            }
                          }}
                        />

                        <button
                          className="btn primary explorer-search-button"
                          type="button"
                          onClick={searchCryptoPittz}
                        >
                          Search
                        </button>
                      </div>

                      <select
                        value={explorerSort}
                        onChange={(event) => setExplorerSort(event.target.value)}
                      >
                        <option value="rank">Best Rank</option>
                        <option value="score">Highest Score</option>
                        <option value="name">Name</option>
                      </select>

                      <select
                        value={explorerBloodline}
                        onChange={(event) => setExplorerBloodline(event.target.value)}
                      >
                        <option value="all">All Bloodlines</option>

                        {Object.keys(explorerSummary.bloodlines).map((bloodline) => (
                          <option key={bloodline} value={bloodline}>
                            {bloodline}
                          </option>
                        ))}
                      </select>

                      <select
                        value={explorerType}
                        onChange={(event) => setExplorerType(event.target.value)}
                      >
                        <option value="all">All Types</option>
                        <option value="Core">Core</option>
                        <option value="Secret">Secret</option>
                        <option value="Holo">Holo</option>
                        <option value="Legendary">Legendary</option>
                      </select>
                    </div>

                    <div className="pittz-results-bar">
                      <span>
                        Showing {explorerPageNfts.length} of{" "}
                        {filteredExplorerNfts.length.toLocaleString()} {activeCollection.name}
                      </span>

                      {(explorerSearch ||
                        explorerBloodline !== "all" ||
                        explorerType !== "all" ||
                        explorerSort !== "rank") && (
                        <button
                          className="reset-filters"
                          type="button"
                          onClick={() => {
                            setExplorerSearch("");
                            setExplorerSort("rank");
                            setExplorerBloodline("all");
                            setExplorerType("all");
                          }}
                        >
                          ↻ Reset Filters
                        </button>
                      )}
                    </div>

                    <ExplorerPagination
                      currentPage={explorerPage}
                      totalItems={explorerFilteredTotal}
                      pageSize={EXPLORER_PAGE_SIZE}
                      onPageChange={setExplorerPage}
                    />

                    {globalSearchLoading && <p className="subtitle">Searching CryptoPittz...</p>}

                    {globalSearchError && (
                      <div className="explorer-search-message">{globalSearchError}</div>
                    )}

                    {globalSearchResult &&
                      (() => {
                        const stats = getPittzStats(globalSearchResult.attributes);

                        return (
                          <div
                            className="explorer-search-result"
                            onClick={() => openNftDetails(globalSearchResult)}
                          >
                            {globalSearchResult.media?.[0]?.url && (
                              <img
                                src={globalSearchResult.media[0].url}
                                alt={globalSearchResult.name}
                              />
                            )}

                            <div>
                              <span>Search Result</span>

                              <h3>{globalSearchResult.name}</h3>

                              <small>{globalSearchResult.identifier}</small>

                              <div className="search-result-stats">
                                {stats.rank && <strong>🏆 #{stats.rank}</strong>}
                                {stats.score && <strong>⚡ {stats.score}</strong>}
                                {stats.bloodline && <strong>{stats.bloodline}</strong>}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                    <div className="wallet-nft-grid">
                      {explorerPageNfts.map((nft) => {
                        const isOwned =
                          Boolean(account.address) &&
                          nfts.some((ownedNft) => ownedNft.identifier === nft.identifier);

                        return (
                          <NftCard
                            key={nft.identifier}
                            nft={nft}
                            isOwned={isOwned}
                            variant="explorer"
                            onClick={() => openNftDetails(nft, filteredExplorerNfts)}
                          />
                        );
                      })}
                    </div>
                    <ExplorerPagination
                      currentPage={explorerPage}
                      totalItems={explorerFilteredTotal}
                      pageSize={EXPLORER_PAGE_SIZE}
                      onPageChange={setExplorerPage}
                    />
                  </>
                )}
              </div>
            </div>
          </section>

          <GallerySection />

          <section id="traits">
            <div className="section-title">
              <h2>Traits (Soon)</h2>
              <span>Explore what makes every Pitt unique.</span>
            </div>

            <div className="panel">
              <div className="inner">
                <p className="subtitle">
                  A future trait explorer can let visitors search CryptoPittz by colors, accessories
                  and other characteristics.
                </p>
              </div>
            </div>
          </section>

          <section id="rarity">
            <div className="section-title">
              <h2>Rarity (Soon)</h2>
              <span>Collection stats are coming later.</span>
            </div>

            <div className="panel">
              <div className="inner">
                <p className="subtitle">
                  This area can eventually display rarity information using CryptoPittz NFT
                  metadata.
                </p>
              </div>
            </div>
          </section>

          <section id="faq">
            <div className="section-title">
              <h2>FAQ</h2>
              <span>Common questions about CryptoPittz.</span>
            </div>

            <div className="faq">
              <details>
                <summary>When is the mint?</summary>
                <p>Additional mint information will be added here.</p>
              </details>

              <details>
                <summary>What chain is CryptoPittz on?</summary>
                <p>CryptoPittz is being prepared for integration with the MultiversX ecosystem.</p>
              </details>

              <details>
                <summary>What do holders get?</summary>
                <p>Holder utilities and community features can be added as the project grows.</p>
              </details>

              <details>
                <summary>How can I join the community?</summary>
                <p>
                  Community and social links will be added to the site as they become available.
                </p>
              </details>
            </div>
          </section>

          <section id="join">
            <div className="section-title">
              <h2>CryptoPittz Ecosystem</h2>
              <span>Explore the community, marketplace, tokens, and ecosystem</span>
            </div>

            <div className="panel">
              <div
                className="inner"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "12px",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ maxWidth: "70ch" }}>
                  <p className="subtitle" style={{ margin: 0 }}>
                    Follow the project, connect with the community and watch as the CryptoPittz
                    universe continues to grow.
                  </p>
                </div>

                <div className="ecosystem-grid">
                  <div className="ecosystem-card">
                    <div className="ecosystem-icon">💬</div>

                    <h3>Join the Pack</h3>

                    <p>
                      Connect with the CryptoPittz community, talk with holders, and stay up to date
                      on the project.
                    </p>

                    <a
                      className="btn primary"
                      href="https://discord.gg/PP8S8DX9t"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Join Discord ↗
                    </a>
                  </div>

                  <div className="ecosystem-card">
                    <div className="ecosystem-icon">🛒</div>

                    <h3>Marketplace</h3>

                    <p>
                      Browse, buy, and explore both CryptoPittz collections on the OOX marketplace.
                    </p>

                    <div className="ecosystem-actions">
                      <a
                        className="btn primary"
                        href="https://www.oox.art/marketplace/collections/PITTZ-1a4c2d"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Original Pittz ↗
                      </a>

                      <a
                        className="btn"
                        href="https://www.oox.art/marketplace/collections/PITTZVICE-c3ec94"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Vice Pittz ↗
                      </a>
                    </div>
                  </div>

                  <div className="ecosystem-card">
                    <div className="ecosystem-icon">🦴</div>

                    <h3>BONEZ</h3>

                    <p>
                      Swap EGLD for BONEZ on xExchange and access the token used within the
                      CryptoPittz ecosystem.
                    </p>

                    <a
                      className="btn primary"
                      href="https://xexchange.com/trade?firstToken=EGLD&secondToken=BONEZ-ff9a73"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Swap BONEZ ↗
                    </a>
                  </div>

                  <div className="ecosystem-card">
                    <div className="ecosystem-icon">🧠</div>

                    <h3>Pittensor</h3>

                    <p>View the Pittensor account and its activity through TaoStats.</p>

                    <a
                      className="btn primary"
                      href="https://taostats.io/account/5ChwfAKs7YEHX6QNJub6DYzKhP47bxjkVdFCh3ndX6vXYMa7/transactions"
                      target="_blank"
                      rel="noreferrer"
                    >
                      View TaoStats ↗
                    </a>
                  </div>
                  <div className="ecosystem-card">
                    <div className="ecosystem-icon">📱</div>

                    <h3>xPortal</h3>

                    <p>
                      Get the xPortal app and join the MultiversX ecosystem using the CryptoPittz
                      referral link.
                    </p>

                    <a
                      className="btn primary"
                      href="https://xportal.app.link/referral?code=xdsu8lsipv"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Get xPortal ↗
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="contact" style={{ marginTop: "18px" }}>
            <div className="section-title">
              <h2>Contact</h2>
              <span>CryptoPittz</span>
            </div>

            <div className="panel">
              <div className="inner">
                <p className="subtitle">Official contact information will be added here.</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer>
        <div
          className="container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "14px",
            flexWrap: "wrap",
          }}
        >
          <div>© {new Date().getFullYear()} CryptoPittz • All vibes reserved 🐾</div>

          <div style={{ opacity: 0.9 }}>Built for the CryptoPittz community</div>
        </div>
      </footer>

      <NftDetailModal
        nft={selectedNft}
        hasMultipleNfts={modalNfts.length > 1}
        isOwned={
          Boolean(account.address) &&
          nfts.some((ownedNft) => ownedNft.identifier === selectedNft?.identifier)
        }
        onClose={closeNftDetails}
        onPrevious={showPreviousNft}
        onNext={showNextNft}
      />
      {walletOverlayOpen && (
        <button
          className="walletconnect-close"
          type="button"
          aria-label="Close wallet connection"
          onClick={() => {
            if (walletConnectAnchorRef.current) {
              walletConnectAnchorRef.current.replaceChildren();
            }

            setWalletOverlayOpen(false);
            setMobileWalletConnecting(false);
          }}
        >
          ✕
        </button>
      )}

      <div ref={walletConnectAnchorRef} className="walletconnect-anchor" />

      <div ref={walletConnectAnchorRef} className="walletconnect-anchor" />
    </>
  );
}

export default App;
