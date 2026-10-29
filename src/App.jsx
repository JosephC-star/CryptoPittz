import {NeonWelcome,IntroDisclosure} from "./features/home/NeonWelcome";
import {loginWithWallet,hasWalletBridge,usesDirectWalletConnection} from './utils/connectWallet';
import WalletConnectModal from './components/WalletConnectModal';
import { useRef, useState } from "react";
import "./App.css";
import "./features/dawg-pound/entrance.css";

import { UnlockPanelManager } from "@multiversx/sdk-dapp/out/managers/UnlockPanelManager";
import { useGetAccount } from "@multiversx/sdk-dapp/out/react/account/useGetAccount";
import { getAccountProvider } from "@multiversx/sdk-dapp/out/providers/helpers/accountProvider";


import ExplorerControls from "./components/explorer/ExplorerControls";
import ExplorerPagination from "./components/explorer/ExplorerPagination";
import NftCard from "./components/nft/NftCard";
import NftDetailModal from "./components/nft/NftDetailModal";
import "./features/bonez-burn/pittensor.css";
import BonezMarketSection from "./features/bonez-market/BonezMarketSection";
import useBonezMarket from "./features/bonez-market/useBonezMarket";
import useExplorerData from "./features/explorer/useExplorerData";
import useOoxListings from "./features/explorer/useOoxListings";
import "./features/my-pittz/my-pittz-page.css";
import useWalletPittz from "./features/my-pittz/useWalletPittz";
import TraitFinder from "./features/traits/TraitFinder";
import { getPittzStats, getPittzTraits } from "./utils/nftUtils";


function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState(null);
  const [desktopGroup, setDesktopGroup] = useState(null);
  const [selectedNft, setSelectedNft] = useState(null);
  const [initialOffersOpen,setInitialOffersOpen]=useState(false);
  const [modalNfts, setModalNfts] = useState([]);
  const [explorerExpanded, setExplorerExpanded] = useState(false);
  const [explorerHidden, setExplorerHidden] = useState(false);
  const explorerHeadingRef = useRef(null);
  const explorerToggleRef = useRef(null);
  function retractExplorer() {
    setExplorerHidden(true);
    setExplorerPage(0);
    explorerToggleRef.current?.focus({ preventScroll: true });
    explorerHeadingRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }
  const [explorerSearch, setExplorerSearch] = useState("");
  const [explorerSort, setExplorerSort] = useState("rank");
  const [explorerBloodline, setExplorerBloodline] = useState("all");
  const [explorerType, setExplorerType] = useState("all");
  const [explorerTraits, setExplorerTraits] = useState({});
  const [explorerSale, setExplorerSale] = useState("all");
  const [randomPittLoading, setRandomPittLoading] = useState(false);
  const [randomPittError, setRandomPittError] = useState("");
  const [randomPittMode, setRandomPittMode] = useState("surprise");
  const walletConnectAnchorRef = useRef(null);
  const [walletOverlayOpen, setWalletOverlayOpen] = useState(false);

  const [mobileWalletConnecting, setMobileWalletConnecting] = useState(false);
  const [mobileWalletError, setMobileWalletError] = useState("");
  const [supportEmailCopied, setSupportEmailCopied] = useState(false);
  const [supportCopyError,setSupportCopyError]=useState(false);

  const explorerVisiblePageSize = explorerExpanded ? 100 : 40;

  const {
    retry:retryExplorer,
    indexError:explorerIndexError,
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
  } = useExplorerData(explorerVisiblePageSize);
  const {
    listingMap: explorerListingMap,
    loading: explorerListingsLoading,
    error: explorerListingsError,
  } = useOoxListings(activeCollection.collection);

  const account = useGetAccount();
  const { nfts, loading: nftsLoading, error: nftsError, retry:retryWallet } = useWalletPittz(account.address);
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

  function navigateExplorer(target) {
    setExplorerHidden(false);
    setExplorerExpanded(true);
    setExplorerPage(0);
    setMobileOpen(false);
    setDesktopGroup(null);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.getElementById(target)?.scrollIntoView({ block: "start", behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? "instant" : "smooth" });
    }));
  }

  function toggleMobileGroup(group) {
    setMobileGroup((current) => (current === group ? null : group));
  }

  function resetExplorerFilters() {
    setExplorerSearch("");
    setExplorerSort("rank");
    setExplorerBloodline("all");
    setExplorerType("all");
    setExplorerTraits({});
    setExplorerSale("all");
    setExplorerPage(0);
    clearGlobalSearch();
  }

  function changeExplorerCollection(collection) {
    setExplorerCollection(collection);
    resetExplorerFilters();
  }

  function isMobileDevice() {
    return usesDirectWalletConnection();
  }

  async function connectWallet() {
    if (mobileWalletConnecting) return;
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
      setWalletOverlayOpen(!hasWalletBridge());

      await loginWithWallet(walletConnectAnchorRef.current);

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
      walletConnectAnchorRef.current?.replaceChildren();
      setWalletOverlayOpen(false);
      setMobileWalletConnecting(false);
    }
  }

  function openNftDetails(nft, nftList = [nft], offersOpen = false) {
    setInitialOffersOpen(offersOpen);
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

      const traits = getPittzTraits(nft.attributes);
      const matchesTraits = Object.entries(explorerTraits).every(([category, values]) =>
        traits.some((item) => item.trait === category && values.includes(item.value)),
      );

      const matchesSale =
        explorerSale === "all" || explorerListingMap.has(nft.identifier);

      return matchesSearch && matchesBloodline && matchesType && matchesTraits && matchesSale;
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

      if (explorerSort === "price-asc" || explorerSort === "price-desc") {
        const aListing = explorerListingMap.get(a.identifier);
        const bListing = explorerListingMap.get(b.identifier);

        if (!aListing && !bListing) return 0;
        if (!aListing) return 1;
        if (!bListing) return -1;

        const aPrice = Number(aListing.dollarValue) || Number(aListing.price) || Infinity;
        const bPrice = Number(bListing.dollarValue) || Number(bListing.price) || Infinity;

        return explorerSort === "price-asc" ? aPrice - bPrice : bPrice - aPrice;
      }

      return 0;
    });

  const explorerFilteredTotal = filteredExplorerNfts.length;

  const explorerPageNfts = filteredExplorerNfts.slice(
    explorerPage * explorerVisiblePageSize,
    explorerPage * explorerVisiblePageSize + explorerVisiblePageSize,
  );

  return (
    <>
      <div className="blob b1"></div>
      <div className="blob b2"></div>
      <div className="blob b3"></div>

      <header className="site-header">
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
              <div className={`nav-item ${desktopGroup === "explore" ? "open" : ""}`}>
                <button
                  className="nav-btn"
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={desktopGroup === "explore"}
                  onClick={() =>
                    setDesktopGroup((current) => (current === "explore" ? null : "explore"))
                  }
                >
                  Explore <span className="caret" aria-hidden="true"></span>
                </button>
                <div className="dropdown" role="menu">
                  <a href="#arcade" onClick={() => setDesktopGroup(null)}>Pittz Playground</a>
                  <a href="/my-pittz/" onClick={() => setDesktopGroup(null)}>My Pittz</a>
                  <a href="/dawg-pound/" onClick={() => setDesktopGroup(null)}>Pittz Dawg Pound</a>
                  <a href="#explorer" onClick={() => navigateExplorer("explorer")}>CryptoPittz Explorer</a>
                  <a href="#traits" onClick={() => navigateExplorer("traits")}>Traits</a>
                  <a href="#merch" onClick={() => setDesktopGroup(null)}>Pittz Flea Market</a>
                </div>
              </div>

              <div className={`nav-item ${desktopGroup === "ecosystem" ? "open" : ""}`}>
                <button
                  className="nav-btn"
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={desktopGroup === "ecosystem"}
                  onClick={() =>
                    setDesktopGroup((current) => (current === "ecosystem" ? null : "ecosystem"))
                  }
                >
                  Ecosystem <span className="caret" aria-hidden="true"></span>
                </button>

                <div className="dropdown" role="menu">
                  <a href="#join">CryptoPittz Ecosystem</a>
                  <a href="/pittensor/">Pittensor →</a>

                  <a href="https://discord.gg/PP8S8DX9t" target="_blank" rel="noreferrer">
                    Discord ↗
                  </a>

                  <a
                    href="/dawg-pound/?collection=original"
                  >
                    Marketplace →
                  </a>

                  <a
                    href="/financial-district/"
                  >
                    Financial District →
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
                  Pittz Playground
                </a>

                <a href="/my-pittz/" onClick={closeMobileMenu}>
                  My Pittz
                </a>

                <a href="/dawg-pound/" onClick={closeMobileMenu}>Pittz Dawg Pound</a>

                <a href="#explorer" onClick={() => navigateExplorer("explorer")}>
                  CryptoPittz Explorer
                </a>

                <a href="#traits" onClick={() => navigateExplorer("traits")}>
                  Traits
                </a>

                <a href="#merch" onClick={closeMobileMenu}>
                  Pittz Flea Market
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
                  href="/dawg-pound/?collection=original"
                  onClick={closeMobileMenu}
                >
                  Marketplace →
                </a>

                <a
                  href="/financial-district/"
                  onClick={closeMobileMenu}
                >
                  Financial District →
                </a>

                <a href="/pittensor/" onClick={closeMobileMenu}>Pittensor →</a>

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
            <div className="panel hero-copy-panel hero-neon-panel">
              <div className="hero-cosmic-bg" aria-hidden="true" />

              <div className="hero-cosmic-nebula" aria-hidden="true" />

              <div className="hero-pitbull-wrap" aria-hidden="true">
                <img src="/images/neon-pitbull-hero.png" alt="" className="hero-pitbull-art" />
              </div>

              <div className="inner">
                <NeonWelcome/><div className="badge">⚡ Welcome to the CryptoPittz universe</div>

                <h2 className="title">CryptoPittz is a neon-charged collectible universe.</h2>

                <IntroDisclosure>the collection has two drops: the original Pittz consisting of
                  5310 art pieces released in to wild back in 2021 and the 2nd collection, Vice
                  Pittz, consisting of only 1395 retro themed nfts. Both collections feature
                  references from pop culture, and possess a free-spirited, gritty, degen vibe. Hold
                  your Pittz in your wallet and earn $BONEZ automatically every Sunday. No staking,
                  just pure passive accumulation. Every month the team uses 75% of the profits from
                  the Pittensor fund, on Bittensor, to buy back and burn the $BONEZ. the remaining
                  25% gets compounded back into the Pettensor fund, crushing supply and building
                  long-term value. You Earn, We Burn! We are a tight crew of degens who love art,
                  the memes, and the culture. Merch and pet products on the horizon. Woof Woof!</IntroDisclosure>

                <div className="chip-row">
                  <div className="chip">🎨 Art-first vibe</div>
                  <div className="chip">🧩 Utility-ready</div>
                  <div className="chip">🧠 Built to expand</div>
                  <div className="chip">📱 Mobile-friendly</div>
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

          <a id="arcade" className="playground-release-entrance" href={`/playground/${account.address ? `?wallet=${encodeURIComponent(account.address)}` : ''}#/playground`}>
            <div>
              <span className="playground-release-status">THE PACK’S NEON YARD</span>
              <h2>Pittz Playground</h2>
              <p>Nine neon cabinets. One pack. Chase high scores, collect trophies, and stay for the vibe.</p>
              <span className="btn primary">Enter the Playground →</span>
            </div>
            <div className="playground-release-art neon-yard-entrance-art" aria-hidden="true"><i className="neon-yard-entrance-glint" /></div>
          </a>

          <a className="financial-entrance" href="/financial-district/">
            <div className="financial-entrance-copy"><small>THE PACK’S GOLDEN QUARTER</small><h2>Pittz Financial District</h2><p>Swap 16 currencies, add BONEZ + WEGLD liquidity, and stake BONEZ—all through your connected wallet.</p><span>You earn, we burn!</span><strong>Enter the Financial District →</strong></div>
            <div className="financial-entrance-art" aria-hidden="true"><i className="financial-entrance-shine"/><i className="financial-entrance-dust"/></div>
          </a>

          <a className="pittensor-entrance" href="/pittensor/">
            <div><small>THE PACK’S INDUSTRIAL HEART</small><h2>Pittensor</h2><p>You earn, we burn! Add BONEZ to the pack’s monthly burn pile.</p><strong>Enter Pittensor →</strong></div>
            <div className="pittensor-entrance-art" aria-hidden="true" />
            <span className="pittensor-entrance-steam" aria-hidden="true">{[12, 48, 82].map((x, i) => <i key={x} style={{ '--steam-x': `${x}%`, '--steam-drift': `${i % 2 ? 30 : -24}px`, '--steam-delay': `${-i * 4}s` }} />)}</span>
          </a>

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
          <section id="my-pittz" aria-label="My Pittz entrance"><a className="pack-home-entrance" href="/my-pittz/"><div className="pack-entrance-copy"><small>YOUR WALLET. YOUR PACK.</small><h2>My Pittz</h2><p>Browse your Original and Vice Pittz, check earnings, manage listings and offers, or send a Pittz to another wallet.</p><strong>Enter My Pittz →</strong></div><div className="pack-entrance-art" aria-hidden="true">{['green','captain','pink'].map(p=><img key={p} src={'/images/pittzboy/pittzboy-'+p+'.jpg'} alt=""/>)}</div></a></section>
          <section id="dawg-pound-entrance" aria-label="Pittz Dawg Pound">
            <a className="dawg-home-entrance" href="/dawg-pound/"><div className="dawg-entrance-copy"><small>THE PACK’S COLLECTOR DISTRICT</small><h2>Pittz Dawg Pound</h2><p>Find your next pack member. Browse Pittz for sale and collection offers.</p><strong>Enter Pound Town →</strong></div><div className="dawg-entrance-art" aria-hidden="true"/></a>
          </section>

          <section id="explorer" ref={explorerHeadingRef}>
            <div className="section-title explorer-heading">
              <div>
                <h2>CryptoPittz Explorer</h2>
                <span>{explorerExpanded ? "Browse the collection. No wallet required." : "Compact view · 40 Pittz per page. Expand to see 100 at once."}</span>
              </div>
              <button ref={explorerToggleRef} type="button" className="explorer-fold-toggle" aria-expanded={!explorerHidden} aria-controls="explorer-content" onClick={() => {if(explorerHidden)setExplorerHidden(false);else retractExplorer();}}>
                {explorerHidden ? "Open Explorer" : "Retract Explorer"}
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style={{ transform: !explorerHidden ? "rotate(180deg)" : undefined }}><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>



            <div id="explorer-content" hidden={explorerHidden} className={explorerExpanded?"is-expanded":"is-compact"}>

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

                {explorerError&&<div role="status"><p>{explorerError}</p><button className="btn" onClick={retryExplorer}>Retry collection</button></div>}
                {explorerIndexError&&!explorerError&&<div role="status"><p>{explorerIndexError}</p><button className="btn" disabled={explorerAllLoading} onClick={retryExplorer}>Retry collection data</button></div>}
                {!explorerLoading&&!explorerError&&!explorerNfts.length&&<div role="status"><p>No items were returned for this collection page.</p><button className="btn" onClick={()=>{setExplorerPage(0);retryExplorer();}}>Reload first page</button></div>}

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
                      sale={explorerSale}
                      listedCount={explorerListingMap.size}
                      listingsLoading={explorerListingsLoading}
                      listingsError={explorerListingsError}
                      onSaleChange={(value) => {
                        setExplorerSale(value);
                        setExplorerPage(0);
                      }}
                      shownCount={explorerPageNfts.length}
                      filteredCount={filteredExplorerNfts.length}
                      onReset={resetExplorerFilters}
                    />

                    <TraitFinder
                      id="traits"
                      nfts={explorerAllNfts}
                      loading={explorerAllLoading}
                      selected={explorerTraits}
                      onSelectedChange={(nextTraits) => {
                        setExplorerTraits(nextTraits);
                        setExplorerPage(0);
                      }}
                    />

                    <ExplorerPagination
                      currentPage={explorerPage}
                      totalItems={explorerFilteredTotal}
                      pageSize={explorerVisiblePageSize}
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

                    {!filteredExplorerNfts.length&&!explorerAllLoading&&<div role="status"><p>No Pittz match these filters. Try fewer traits or clear the filters.</p><button className="btn" onClick={resetExplorerFilters}>Reset filters</button></div>}
                    <div className="wallet-nft-grid explorer-nft-grid">
                      {explorerPageNfts.map((nft) => {
                        const isOwned =
                          Boolean(account.address) &&
                          nfts.some((ownedNft) => ownedNft.identifier === nft.identifier);

                        return (
                          <NftCard
                            key={nft.identifier}
                            nft={nft}
                            listing={explorerListingMap.get(nft.identifier)}
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
                      pageSize={explorerVisiblePageSize}
                      onPageChange={setExplorerPage}
                    />
                  </>
                )}
              </div>
            </div>
              <div className="explorer-fold-footer">
                <button type="button" className="explorer-fold-toggle" onClick={()=>{setExplorerExpanded(v=>!v);setExplorerPage(0);}}>{explorerExpanded?"Compact view · Show 40 per page":"Show 100 per page"}</button><button type="button" className="explorer-fold-toggle" aria-expanded={!explorerHidden} aria-controls="explorer-content" onClick={retractExplorer}>Retract Explorer ↑</button>
                <span>Keep cruising to the Flea Market.</span>
              </div>
            </div>
          </section>

          <section id="merch" className="merch-coming-soon">
            <div className="merch-neon-banner flea-market-entrance">
              <div className="merch-copy">
                <span className="merch-eyebrow">THE PACK’S BACKSTREET BAZAAR</span>
                <h2>PITTZ<br /><em>FLEA MARKET</em></h2>
                <strong>BIG TALENT. SMALL BOOTHS.</strong>
                <p>Handmade wares, custom creations, and pack-made skills. Step off the main road and into the market.</p>
                <a className="btn primary" href="/flea-market/">Enter the Flea Market →</a>
                <div className="market-entrance-tags" aria-label="The three Pittz bloodlines"><span>Street</span><span>Regal</span><span>Loyal</span></div>
              </div>
              <div className="market-entrance-window">
                <span className="market-sticker">PACK UNITY</span>
                <div className="market-shop-strip"><b>GordonCrypto · Stache Rugs</b><span>Rug shop opening soon · Prices TBD</span><small>YOUR STORE COULD BE NEXT ↗</small></div>
                <i className="market-sign-shimmer" aria-hidden="true" />
              </div>
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
                      Browse Pittz for sale from OOX and XOXNO, right here at The PittzStop.
                    </p>

                    <div className="ecosystem-actions">
                      <a
                        className="btn primary"
                        href="/dawg-pound/?collection=original"
                      >
                        Original Pittz for sale →
                      </a>

                      <a
                        className="btn"
                        href="/?sale=listed&collection=vice#explorer"
                      >
                        Vice Pittz for sale →
                      </a>
                    </div>
                  </div>

                  <div className="ecosystem-card">
                    <div className="ecosystem-icon">🦴</div>

                    <h3>Pittz Financial District</h3>

                    <p>
                      Swap tokens, add BONEZ + WEGLD liquidity, and stake BONEZ.
                      Manage your currencies, pool deposits, and staking rewards in one golden home.
                    </p>

                    <a
                      className="btn primary"
                      href="/financial-district/"
                    >
                      Financial District →
                    </a>
                  </div>

                  <div className="ecosystem-card">
                    <div className="ecosystem-icon">🧠</div>

                    <h3>Pittensor</h3>

                    <p>Add BONEZ to the pack’s monthly burn pile. Deposits join the pile; the team carries out the monthly burn.</p>

                    <a
                      className="btn primary"
                      href="/pittensor/"
                    >
                      Enter Pittensor →
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
                <p className="subtitle">Questions about CryptoPittz, the community, or the flea market? Contact the team.</p>
                <a className="btn primary" href="mailto:Cryptopittz69@gmail.com">Email CryptoPittz ↗</a>
                <p><a href="mailto:Cryptopittz69@gmail.com">Cryptopittz69@gmail.com</a></p>
                <p>For website bugs or technical help, <a href="mailto:support@clemonswebco.com">contact Clemons Web Co.</a> For an item or order, contact its merchant directly.</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer>
        <div className="container footer-inner">
          <a
            className="footer-clemons-credit"
            href="https://clemonswebco.com/"
            target="_blank"
            rel="noreferrer"
          >
            <span>⚡ CRAFTED EXTRA MUSTY BY</span>
            <strong>CLEMONS WEB CO.</strong>
          </a>

          <div className="footer-community">
            <strong>© {new Date().getFullYear()} CryptoPittz</strong>
            <span>All vibes reserved 🐾</span>
            <a href="mailto:Cryptopittz69@gmail.com">Official contact: Cryptopittz69@gmail.com ↗</a>
          </div>

          <div className="footer-support">
            <span>🐛 REPORT A GREMLIN</span>
            <strong>Technical issues or suggestions?</strong>
            <small>support@clemonswebco.com</small>
            <div className="footer-support-actions">
              <a href="mailto:support@clemonswebco.com?subject=CryptoPittz%20Support%20%2F%20Feedback">
                Email Support ↗
              </a>
              <button
                type="button"
                onClick={async () => {
                  setSupportEmailCopied(false);setSupportCopyError(false);
                  try{await navigator.clipboard.writeText("support@clemonswebco.com");setSupportEmailCopied(true);window.setTimeout(() => setSupportEmailCopied(false),1800);}
                  catch{setSupportCopyError(true);}
                }}
              >
                {supportEmailCopied ? "Copied! ✓" : "Copy Address"}
              </button>
            </div>
            {supportCopyError&&<p role="status">Copy unavailable. Select support@clemonswebco.com above, or choose Email Support.</p>}
          </div>

        </div>
      </footer>

      <NftDetailModal
        nft={selectedNft}
        offersOpen={initialOffersOpen}
        listed={Boolean(explorerListingMap.get(selectedNft?.identifier))}
        hasMultipleNfts={modalNfts.length > 1}
        isOwned={
          Boolean(account.address) &&
          nfts.some((ownedNft) => ownedNft.identifier === selectedNft?.identifier)
        }
        onClose={closeNftDetails}
        onPrevious={showPreviousNft}
        onNext={showNextNft}
      />
      <WalletConnectModal open={walletOverlayOpen} anchorRef={walletConnectAnchorRef} onClose={() => {setWalletOverlayOpen(false);setMobileWalletConnecting(false);}} />
    </>
  );
}

export default App;

