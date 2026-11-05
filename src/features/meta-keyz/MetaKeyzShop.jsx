import { useEffect, useRef, useState } from 'react';
import { useGetAccount } from '@multiversx/sdk-dapp/out/react/account/useGetAccount';
import { UnlockPanelManager } from '@multiversx/sdk-dapp/out/managers/UnlockPanelManager';
import WalletConnectModal from '../../components/WalletConnectModal';
import { hasWalletBridge, loginWithWallet, usesDirectWalletConnection } from '../../utils/connectWallet';
import { compactNftPrice } from '../../utils/nftPrice';
import XoxnoPurchasePanel from '../xoxno/XoxnoPurchasePanel';
import './meta-keyz-shop.css';

const keyArtwork = '/flea-market/assets/meta-key.jpg';
const pageSize = 4;

function KeyListing({ nft, visible }) {
  const [checkoutOpened, setCheckoutOpened] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [animationFailed, setAnimationFailed] = useState(false);
  const artwork = `https://media.xoxno.com/nftmedia/${nft.collection}/${nft.identifier}.webp`;

  useEffect(() => {
    if (!visible) setPlaying(false);
  }, [visible]);

  return (
    <article className="key-shop-card" hidden={!visible}>
      {visible && playing && nft.animationUrl && !animationFailed ? (
        <video
          src={nft.animationUrl}
          poster={artwork}
          aria-label={`${nft.name} animation`}
          autoPlay
          muted
          loop
          playsInline
          controls
          onError={() => setAnimationFailed(true)}
        />
      ) : (
        <img src={artwork} alt={nft.name} loading="lazy" onError={event => {
          if (!event.currentTarget.src.endsWith(keyArtwork)) event.currentTarget.src = keyArtwork;
        }} />
      )}
      <div className="key-shop-card-body">
        <h3>{nft.name}</h3>
        <small>{nft.keyType || 'Type unavailable'}</small>
        <p className="key-shop-price">{compactNftPrice(nft.price, true)} EGLD</p>
        {nft.animationUrl && !animationFailed && (
          <button type="button" className="key-shop-animation" onClick={() => setPlaying(value => !value)}>
            {playing ? 'Hide animation' : '▶ Play animation'}
          </button>
        )}
        {animationFailed && <p role="status">Animation unavailable.</p>}
        <details onToggle={event => {
          if (event.currentTarget.open) setCheckoutOpened(true);
        }}>
          <summary>Open checkout</summary>
          {checkoutOpened && <XoxnoPurchasePanel nft={nft} />}
        </details>
      </div>
    </article>
  );
}

export default function MetaKeyzShop() {
  const { address } = useGetAccount();
  const walletAnchor = useRef(null);
  const [walletOpen, setWalletOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [walletError, setWalletError] = useState('');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [keyType, setKeyType] = useState('all');
  const [page, setPage] = useState(0);
  const filtered = listings.filter(nft => keyType === 'all' || nft.keyType === keyType);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleIds = new Set(filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
    .map(nft => nft.identifier));

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    async function load() {
      try {
        const response = await fetch('/.netlify/functions/meta-keyz-listings', { signal: controller.signal });
        if (!response.ok) throw Error('The key rack could not load. Try refreshing the listings.');
        const data = await response.json();
        if (!Array.isArray(data.listings)) throw Error('The key rack returned an invalid response.');
        if (!controller.signal.aborted) setListings(data.listings);
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [attempt]);

  async function connect() {
    if (connecting) return;
    setConnecting(true);
    setWalletError('');
    try {
      if (usesDirectWalletConnection()) {
        setWalletOpen(!hasWalletBridge());
        await loginWithWallet(walletAnchor.current);
      } else {
        UnlockPanelManager.init({ loginHandler: () => {} });
        await UnlockPanelManager.getInstance().openUnlockPanel();
      }
    } catch (error) {
      setWalletError(error.message || 'Could not connect your wallet.');
    } finally {
      walletAnchor.current?.replaceChildren();
      setWalletOpen(false);
      setConnecting(false);
    }
  }

  return (
    <div className="key-shop">
      <header className="key-shop-nav">
        <a href="/community-support/">← Back Booths</a>
        <a href="/flea-market/">Pittz Flea Market ↗</a>
      </header>
      <main className="key-shop-main">
        <section className="key-shop-case" aria-label="Open Meta Key briefcase">
          <div className="key-shop-hero">
            <div>
              <span className="key-shop-kicker">Pittz Flea Market</span>
              <h1>The Meta Key Shop</h1>
              <p>Pick a key from the case, review its price, and approve the EGLD purchase in your wallet.</p>
              {address ? <p className="key-shop-wallet">Wallet connected · {address.slice(0, 10)}…{address.slice(-6)}</p>
                : <button type="button" disabled={connecting} onClick={connect}>{connecting ? 'Connecting…' : 'Connect wallet'}</button>}
              {walletError && <p role="alert">{walletError}</p>}
            </div>
            <img src={keyArtwork} alt="CryptoPittz Meta Key artwork" width="220" height="220" />
          </div>
          <div className="key-shop-case-tray">
            {import.meta.env.VITE_META_KEYZ_TRANSACTIONS === 'true' && <p className="key-shop-notice">Preview checkout uses real EGLD on MultiversX mainnet.</p>}
            <div className="key-shop-rack-header">
              <div><span className="key-shop-kicker">CPMK-8d8a01</span><h2>Keys in the case</h2></div>
              <div className="key-shop-tools">
                <label htmlFor="key-shop-type">Key type</label>
                <select id="key-shop-type" value={keyType} onChange={event => {
                  setKeyType(event.target.value);
                  setPage(0);
                }}>
                  <option value="all">All types</option>
                  <option value="Hodler">Hodler</option>
                  <option value="Diamond">Diamond</option>
                </select>
                <button type="button" onClick={() => setAttempt(value => value + 1)} disabled={loading}>Refresh</button>
              </div>
            </div>
            {loading && <p role="status">Checking listings…</p>}
            {error && <p role="alert">{error}</p>}
            {!loading && !error && filtered.length === 0 && <p>No fixed-price EGLD keys match this filter.</p>}
            <div className="key-shop-grid">
              {listings.map(nft => <KeyListing key={nft.identifier} nft={nft} visible={visibleIds.has(nft.identifier)} />)}
            </div>
            {pageCount > 1 && (
              <nav className="key-shop-pagination" aria-label="Key listing pages">
                <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>← Previous</button>
                <span aria-live="polite">{currentPage + 1} / {pageCount}</span>
                <button type="button" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>Next →</button>
              </nav>
            )}
          </div>
        </section>
      </main>
      <WalletConnectModal open={walletOpen} anchorRef={walletAnchor} onClose={() => setWalletOpen(false)} />
    </div>
  );
}
