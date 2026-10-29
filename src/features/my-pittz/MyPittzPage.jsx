import {useEffect,useRef,useState} from 'react';
import {useGetAccount} from '@multiversx/sdk-dapp/out/react/account/useGetAccount';
import {UnlockPanelManager} from '@multiversx/sdk-dapp/out/managers/UnlockPanelManager';
import {loginWithWallet,hasWalletBridge,usesDirectWalletConnection} from '../../utils/connectWallet';
import WalletConnectModal from '../../components/WalletConnectModal';
import NftDetailModal from '../../components/nft/NftDetailModal';
import useWalletPittz from './useWalletPittz';
import MyPittzSection from './MyPittzSection';
import useBonezMarket from '../bonez-market/useBonezMarket';
import '../../App.css';
import './my-pittz-page.css';
export default function MyPittzPage(){
 const account=useGetAccount(),wallet=useWalletPittz(account.address),{market}=useBonezMarket(),anchor=useRef(null);
 useEffect(()=>{const refresh=()=>wallet.retry();window.addEventListener('pittz-offers-updated',refresh);return()=>window.removeEventListener('pittz-offers-updated',refresh);},[wallet.retry]);
 const [walletOpen,setWalletOpen]=useState(false),[error,setError]=useState(''),[selected,setSelected]=useState(null),[rows,setRows]=useState([]);
 async function connect(){setError('');try{if(!usesDirectWalletConnection()){UnlockPanelManager.init({loginHandler:()=>{}});await UnlockPanelManager.getInstance().openUnlockPanel();return;}setWalletOpen(!hasWalletBridge());await loginWithWallet(anchor.current);setWalletOpen(false);}catch(e){setError(e.message);}finally{anchor.current?.replaceChildren();}}
 function move(step){const i=rows.findIndex(n=>n.identifier===selected.identifier);setSelected(rows[(i+step+rows.length)%rows.length]);}
 return <div className="my-pittz-page"><header className="pack-page-header"><a href="/">🐾 THE PITTZSTOP</a><nav><a href="/dawg-pound/">Dawg Pound</a><a href="/#explorer">Explorer</a><a href="/">Home</a></nav></header><main className="container"><section className="pack-page-hero"><small>YOUR WALLET. YOUR PACK.</small><h1>My Pittz</h1><p>Your collection, earnings, listings, offers and transfers—all in one place.</p></section>{error&&<p role="status">{error}</p>}<MyPittzSection address={account.address} nfts={wallet.nfts} loading={wallet.loading} error={wallet.error} onRetry={wallet.retry} onConnect={connect} bonezUsdPrice={Number(market?.priceUsd)} onOpenNft={(n,list)=>{setRows(list||[n]);setSelected(n);}}/></main><NftDetailModal nft={selected} hasMultipleNfts={rows.length>1} isOwned={!!account.address&&wallet.nfts.some(n=>n.identifier===selected?.identifier)} onClose={()=>setSelected(null)} onPrevious={()=>move(-1)} onNext={()=>move(1)}/><WalletConnectModal open={walletOpen} anchorRef={anchor} onClose={()=>setWalletOpen(false)}/></div>;
}
