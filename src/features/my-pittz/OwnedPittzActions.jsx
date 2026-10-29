import {useState} from 'react';
import {useGetAccount} from '@multiversx/sdk-dapp/out/react/account/useGetAccount';
import OoxTradePanel from '../oox/OoxTradePanel';
import SendPittz from '../send-pittz/SendPittz';
import './my-pittz-page.css';
export default function OwnedPittzActions({nft}){
 const account=useGetAccount(),[mode,setMode]=useState('');
 return <section className="owned-pittz-tools" aria-label="Manage your Pittz"><div className="owned-tools-heading"><span>🐾 YOUR PITTZ</span><strong>Make your next move</strong></div><div className="owned-tools-choices"><button className="btn" aria-pressed={mode==='sell'} onClick={()=>setMode(mode==='sell'?'':'sell')}>Sell this Pittz<span>Set an EGLD price</span></button><button className="btn" aria-pressed={mode==='send'} onClick={()=>setMode(mode==='send'?'':'send')}>Send this Pittz<span>ERD wallet or herotag</span></button></div>{mode==='sell'&&<OoxTradePanel key={nft.identifier} nft={nft} isOwned compact/>}{mode==='send'&&<SendPittz key={account.address+nft.identifier} address={account.address} nfts={[nft]} onRefresh={()=>window.dispatchEvent(new Event('pittz-offers-updated'))}/>}</section>;
}
