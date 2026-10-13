import { useEffect, useRef, useState } from 'react';
import { useGetAccount } from '@multiversx/sdk-dapp/out/react/account/useGetAccount';
import { UnlockPanelManager } from '@multiversx/sdk-dapp/out/managers/UnlockPanelManager';
import { ProviderFactory } from '@multiversx/sdk-dapp/out/providers/ProviderFactory';
import { ProviderTypeEnum } from '@multiversx/sdk-dapp/out/providers/types/providerFactory.types';
import BonezBurner from './BonezBurner';
import EmberField from './EmberField';
import './pittensor.css';
export default function Pittensor() {
  useEffect(() => { document.title = "Pittensor · You earn, we burn! · The PittzStop"; }, []);
  const account = useGetAccount(), anchor = useRef(null);
  const [firing, setFiring] = useState(false), [effects, setEffects] = useState(true);
  const [connecting, setConnecting] = useState(false), [walletError, setWalletError] = useState('');
  const [walletOpen, setWalletOpen] = useState(false);
  const [quality, setQuality] = useState(() => window.matchMedia('(max-width: 700px)').matches ? 'lite' : 'full');
  async function connect() {
    if (connecting) return;
    setConnecting(true); setWalletError('');
    try {
      if (window.matchMedia('(max-width: 700px)').matches) {
        setWalletOpen(true);
        const provider = await ProviderFactory.create({ type: ProviderTypeEnum.walletConnect, anchor: anchor.current });
        await provider.login(); anchor.current?.replaceChildren(); setWalletOpen(false);
      } else {
        UnlockPanelManager.init({ loginHandler: () => {} });
        await UnlockPanelManager.getInstance().openUnlockPanel();
      }
    } catch (error) { setWalletError(error.message || 'Unable to connect your wallet.'); }
    finally { setConnecting(false); }
  }
  return <div className={`pittensor-page ${firing ? 'pittensor-firing' : ''} pittensor-effects-${quality}`}>
    <EmberField firing={firing} enabled={effects} lite={quality === 'lite'} />
    <header className="pittensor-nav"><a className="pittensor-brand" href="/">THE PITTZ<span>STOP</span></a><nav aria-label="Pittensor navigation"><a href="/financial-district/">Financial District</a><a href="/">Back to the Pack ↗</a></nav></header>
    <main className="pittensor-main"><section className="pittensor-hero"><span className="pittensor-kicker"><i /> THE PACK’S INDUSTRIAL HEART</span><h1>PITTENSOR</h1><p className="pittensor-motto">You earn, we burn!</p><p className="pittensor-intro">Feed the pack’s monthly burn pile.<br />The team burns collected BONEZ on the 1st of each month.</p><div className="pittensor-tools"><span>FURNACE 01 · {firing ? 'OVERDRIVE' : 'STANDING BY'}</span><button type="button" aria-pressed={effects} onClick={() => setEffects(!effects)}>Flying embers: {effects ? 'On' : 'Off'}</button><label className="pittensor-effects-choice">Effects<select value={quality} onChange={e => setQuality(e.target.value)}><option value="lite">Lite · smoother on phones</option><option value="full">Full · all details</option></select></label></div></section>
      {walletError && <p role="status" className="burn-error">{walletError}</p>}
      <BonezBurner address={account.address} onConnect={connect} onFireChange={setFiring} dedicated />
      <div className="pittensor-bottom"><span>POWERED BY THE PACK</span><p>Every bone has a story. This is where the next one starts.</p><a href="https://taostats.io/account/5ChwfAKs7YEHX6QNJub6DYzKhP47bxikVdFCh3ndX6vXVMa7/transactions" target="_blank" rel="noreferrer">Pittensor on TaoStats ↗</a></div>
    </main><footer className="pittensor-footer"><a href="/">THE PITTZSTOP</a><span>You earn, we burn!</span></footer>
    <div ref={anchor} className="walletconnect-anchor" />{walletOpen && <button className="walletconnect-close" aria-label="Close wallet connection" onClick={() => { anchor.current?.replaceChildren(); setWalletOpen(false); }}>×</button>}
  </div>;
}
