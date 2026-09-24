import { lazy, Suspense, useRef, useState } from "react";
import "./App.css";

import { UnlockPanelManager } from "@multiversx/sdk-dapp/out/managers/UnlockPanelManager";
import { useGetAccount } from "@multiversx/sdk-dapp/out/react/account/useGetAccount";
import { getAccountProvider } from "@multiversx/sdk-dapp/out/providers/helpers/accountProvider";

import { ProviderFactory } from "@multiversx/sdk-dapp/out/providers/ProviderFactory";
import { ProviderTypeEnum } from "@multiversx/sdk-dapp/out/providers/types/providerFactory.types";

import ExplorerControls from "./components/explorer/ExplorerControls";
import ExplorerPagination from "./components/explorer/ExplorerPagination";
import NftCard from "./components/nft/NftCard";
import NftDetailModal from "./components/nft/NftDetailModal";
import BonezMarketSection from "./features/bonez-market/BonezMarketSection";
import useBonezMarket from "./features/bonez-market/useBonezMarket";
import useExplorerData from "./features/explorer/useExplorerData";
import MyPittzSection from "./features/my-pittz/MyPittzSection";
import useWalletPittz from "./features/my-pittz/useWalletPittz";
import { getPittzStats } from "./utils/nftUtils";

const ArcadeHub = lazy(() => import("./features/arcade/ArcadeHub"));

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState(null);
  const [selectedNft, setSelectedNft] = useState(null);
  const [modalNfts, setModalNfts] = useState([]);
  const [explorerSearch, setExplorerSearch] = useState("");
  const [explorerSort, setExplorerSort] = useState("rank");
  const [explorerBloodline, setExplorerBloodline] = useState("all");
  const [explorerType, setExplorerType] = useState("all");
  const [randomPittLoading, setRandomPittLoading] = useState(false);
  const [randomPittError, setRandomPittError] = useState("");
  const [randomPittMode, setRandomPittMode] = useState("surprise");
  const walletConnectAnchorRef = useRef(null);
  const [walletOverlayOpen, setWalletOverlayOpen] = useState(false);

  const [mobileWalletConnecting, setMobileWalletConnecting] = useState(false);
  const [mobileWalletError, setMobileWalletError] = useState("");

  const EXPLORER_PAGE_SIZE = 100;

  const {
    activeCollection,
    allNfts: explorerAllNfts,
    clearSearch: clearGlobalSearch,
    collection: explorerCollection,
    collectionTotal: explorerTotal,
    indexLoading: explorerAllLoading,
    indexReady: explorerIndexReady,
    loadProgress: explorerLoadProgress,
    originalTotal,
    page: explorerPage,
    pageError: explorerError,
    pageLoading: explorerLoading,
    pageNfts: explorerNfts,
    searchCryptoPittz,
    searchError: globalSearchError,
    searchLoading: globalSearchLoading,
    searchResult: globalSearchResult,
    setCollection: setExplorerCollection,
    setPage: setExplorerPage,
    viceTotal,
  } = useExplorerData(EXPLORER_PAGE_SIZE);

  const account = useGetAccount();
  const { nfts, loading: nftsLoading, error: nftsError } = useWalletPittz(account.address);
  const {
    market: bonezMarket,
    marketLoading: bonezMarketLoading,
    marketError: bonezMarketError,
    marketStatus: bonezMarketStatus,
    marketUpdated: bonezMarketUpdated,
    chart: bonezChart,
    chartLoading: bonezChartLoading,
    chartError: bonezChartError,
    chartRange: bonezChartRange,
    chartChange: bonezChartChange,
    setChartRange: setBonezChartRange,
  } = useBonezMarket();

  UnlockPanelManager.init({
    loginHandler: () => {
      console.log("Wallet connected!");
    },
  });
  function closeMobileMenu() {
    setMobileOpen(false);
  }

  function toggleMobileGroup(group) {
    setMobileGroup((current) => (current === group ? null : group));
  }

  function resetExplorerFilters() {
    setExplorerSearch("");
    setExplorerSort("rank");
    setExplorerBloodline("all");
    setExplorerType("all");
    setExplorerPage(0);
    clearGlobalSearch();
  }

  function changeExplorerCollection(collection) {
    setExplorerCollection(collection);
    resetExplorerFilters();
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
                  Explore <span className="caret" aria-hidden="true"></span>
                </div>
                <div className="dropdown" role="menu">
                  <a href="#arcade">CryptoPittz Arcade</a>
                  <a href="#my-pittz">My Pittz</a>
                  <a href="#explorer">CryptoPittz Explorer</a>
                  <a href="#traits">Traits</a>
                  <a href="#rarity">Rarity</a>
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
            <div className={`mobile-group ${mobileGroup === "explore" ? "open" : ""}`}>
              <button
                className="mobile-toggle"
                type="button"
                onClick={() => toggleMobileGroup("explore")}
              >
                Explore <span className="caret"></span>
              </button>

              <div className="mobile-links">
                <a href="#arcade" onClick={closeMobileMenu}>
                  CryptoPittz Arcade
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
                  <a className="btn primary" href="#arcade">
                    Enter the Arcade
                  </a>

                  <a className="btn" href="#explorer">
                    Explore the Pittz
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

          <Suspense
            fallback={<div className="bonez-market-loading">Opening CryptoPittz Arcade...</div>}
          >
            <ArcadeHub />
          </Suspense>

          <BonezMarketSection
            market={bonezMarket}
            marketLoading={bonezMarketLoading}
            marketError={bonezMarketError}
            marketStatus={bonezMarketStatus}
            marketUpdated={bonezMarketUpdated}
            chart={bonezChart}
            chartLoading={bonezChartLoading}
            chartError={bonezChartError}
            chartRange={bonezChartRange}
            chartChange={bonezChartChange}
            onChartRangeChange={setBonezChartRange}
          />
          <MyPittzSection
            address={account.address}
            nfts={nfts}
            loading={nftsLoading}
            error={nftsError}
            bonezUsdPrice={Number(bonezMarket?.priceUsd)}
            onOpenNft={openNftDetails}
          />
          <section id="explorer">
            <div className="section-title">
              <h2>CryptoPittz Explorer</h2>
              <span>Browse the collection. No wallet required.</span>
            </div>

            <div className="explorer-tabs">
              <button
                type="button"
                className={`explorer-tab ${explorerCollection === "original" ? "active" : ""}`}
                onClick={() => changeExplorerCollection("original")}
              >
                Original Pittz
                <span>{originalTotal ? originalTotal.toLocaleString() : "..."}</span>
              </button>

              <button
                type="button"
                className={`explorer-tab ${explorerCollection === "vice" ? "active" : ""}`}
                onClick={() => changeExplorerCollection("vice")}
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
                    <ExplorerControls
                      activeCollection={activeCollection}
                      collectionTotal={explorerTotal}
                      indexLoading={explorerAllLoading}
                      indexReady={explorerIndexReady}
                      loadProgress={explorerLoadProgress}
                      search={explorerSearch}
                      onSearchChange={(value) => {
                        setExplorerSearch(value);
                        clearGlobalSearch();
                      }}
                      onSearch={() => searchCryptoPittz(explorerSearch)}
                      sort={explorerSort}
                      onSortChange={(value) => {
                        setExplorerSort(value);
                        setExplorerPage(0);
                      }}
                      bloodline={explorerBloodline}
                      bloodlines={Object.keys(explorerSummary.bloodlines)}
                      onBloodlineChange={(value) => {
                        setExplorerBloodline(value);
                        setExplorerPage(0);
                      }}
                      type={explorerType}
                      onTypeChange={(value) => {
                        setExplorerType(value);
                        setExplorerPage(0);
                      }}
                      shownCount={explorerPageNfts.length}
                      filteredCount={filteredExplorerNfts.length}
                      onReset={resetExplorerFilters}
                    />

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

                    <div className="wallet-nft-grid explorer-nft-grid">
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
