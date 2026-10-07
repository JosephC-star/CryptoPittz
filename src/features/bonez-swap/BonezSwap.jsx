import { useEffect, useRef, useState } from 'react';
import { useGetAccount } from '@multiversx/sdk-dapp/out/react/account/useGetAccount';
import { UnlockPanelManager } from '@multiversx/sdk-dapp/out/managers/UnlockPanelManager';
import { ProviderFactory } from '@multiversx/sdk-dapp/out/providers/ProviderFactory';
import { ProviderTypeEnum } from '@multiversx/sdk-dapp/out/providers/types/providerFactory.types';
import { getAccountProvider } from '@multiversx/sdk-dapp/out/providers/helpers/accountProvider';
import { BONEZ, atomic, human, minimum, MAX_AGE } from './validation';
import { getJson, reviewSwap, submitSwap, verifyQuote } from './transactions';
import { fetchSwapQuote } from './quote';
import { getToken } from './tokens';
import TokenPicker from './TokenPicker';
import './swap.css';
const logo='/images/cryptopittz-bonez-transparent.png';
function displayAmount(raw, decimals) {
  const exact = human(raw, decimals);
  const [whole, fraction = ''] = exact.split('.');
  if (BigInt(raw) > 0n && whole === '0' && !/[1-9]/.test(fraction.slice(0, 4))) return '<0.0001';
  return whole + '.' + fraction.slice(0, 4).padEnd(4, '0');
}
export default function BonezSwap() {
  const account=useGetAccount();
  const [input,setInput]=useState('EGLD'),[output,setOutput]=useState(BONEZ),[amount,setAmount]=useState('0.01'),[slippage,setSlippage]=useState(50);
  const [quote,setQuote]=useState(null),[review,setReview]=useState(null),[busy,setBusy]=useState(false);
  const [status,setStatus]=useState('Connect your wallet or explore a live quote.'),[balances,setBalances]=useState(null);
  const [sent,setSent]=useState(null),[confirmed,setConfirmed]=useState(false),[overlay,setOverlay]=useState(false);
  const anchor=useRef(null),generation=useRef(0),lock=useRef(false);
  const payToken=getToken(input),receiveToken=getToken(output),inDecimals=payToken.decimals,outDecimals=receiveToken.decimals;
  function invalidate(){generation.current++;setQuote(null);setReview(null);setSent(null);setConfirmed(false);}
  useEffect(()=>{
    generation.current++;setQuote(null);setReview(null);setBalances(null);
    if(!account.address)return;
    const controller=new AbortController();
    const selected=[...new Set([input,output].filter(id=>id!=='EGLD'))];
    Promise.all([getJson(`https://api.multiversx.com/accounts/${account.address}`,controller.signal),...selected.map(id=>getJson(`https://api.multiversx.com/accounts/${account.address}/tokens/${id}`,controller.signal,true))])
      .then(([a,...tokens])=>{if(!controller.signal.aborted)setBalances(Object.fromEntries([['EGLD',a.balance],...selected.map((id,i)=>[id,tokens[i]?.balance||'0'])]));}).catch(()=>{if(!controller.signal.aborted)setStatus('Could not load wallet balances. Please refresh.');});
    return ()=>controller.abort();
  },[account.address,confirmed,input,output]);
  useEffect(()=>{
    if(!quote||busy)return;
    const timer=setTimeout(()=>{setQuote(null);setReview(null);setStatus('Quote expired. Get a fresh quote.');},Math.max(0,quote.created+MAX_AGE-Date.now()));
    return ()=>clearTimeout(timer);
  },[quote,busy]);
  useEffect(()=>{
    if(!sent?.hash)return;
    let cancelled=false,timer;
    async function poll(){
      try{
        const tx=await getJson(`https://api.multiversx.com/transactions/${sent.hash}`);
        if(cancelled)return;
        if(tx.status==='success'){setConfirmed(true);setStatus('Swap complete. You earn, we burn!');return;}
        if(['fail','invalid'].includes(tx.status)){setStatus('The swap failed. Check the transaction details before trying again.');return;}
      }catch{/* Indexing may lag after broadcast. Keep the transaction link available. */}
      if(!cancelled)timer=setTimeout(poll,6000);
    }
    poll();return ()=>{cancelled=true;clearTimeout(timer);};
  },[sent]);
  async function connect(){
    if(lock.current)return;
    if(!window.matchMedia('(max-width: 700px)').matches){void UnlockPanelManager.getInstance().openUnlockPanel();return;}
    lock.current=true;setBusy(true);setOverlay(true);setStatus('Connect using xPortal.');
    try{const provider=await ProviderFactory.create({type:ProviderTypeEnum.walletConnect,anchor:anchor.current});await provider.login();setStatus('Wallet connected. Get a fresh quote.');}
    catch(e){setStatus(e.message||'Wallet connection was cancelled.');}
    finally{anchor.current?.replaceChildren();setOverlay(false);setBusy(false);lock.current=false;}
  }
  async function getQuote(e){
    e.preventDefault();if(lock.current)return;
    invalidate();const id=generation.current;
    lock.current=true;setBusy(true);setStatus('Finding a live route through JEX…');
    try{
      const value=atomic(amount.trim(),inDecimals);
      const data={quote:await fetchSwapQuote(input,value,fetch,output)};
      verifyQuote(data.quote,input,value,output);
      minimum(data.quote,slippage);
      if(id!==generation.current)return;
      setQuote({q:data.quote,input,output,amount:value,created:Date.now()});setStatus('Quote ready. Review your swap before signing.');
    }catch(e){setStatus(e.message||'Unable to fetch a quote.');}
    finally{lock.current=false;setBusy(false);}
  }
  async function prepare(){
    if(lock.current||!quote)return;
    lock.current=true;setBusy(true);setStatus('Checking wallet balance and simulating the swap…');
    const id=generation.current;
    try{const result=await reviewSwap({...quote,slippage});if(id===generation.current){setReview(result);setStatus('Review the amounts below, then approve in your wallet.');}}
    catch(e){setStatus(e.message||'Unable to prepare swap.');setReview(null);}
    finally{lock.current=false;setBusy(false);}
  }
  async function sign(){
    if(lock.current||!review)return;
    lock.current=true;setBusy(true);setStatus('Approve the swap in your wallet. Open xPortal manually if needed.');
    try{const result=await submitSwap(review);setSent(result);setQuote(null);setReview(null);setStatus(result.hash?'Swap sent. Waiting for network confirmation…':'Swap submitted. Check your wallet history for confirmation.');}
    catch(e){setStatus(e.message||'Signing was cancelled.');setReview(null);setQuote(null);}
    finally{lock.current=false;setBusy(false);}
  }
  function max(){
    if(!balances)return;
    const balance=BigInt(balances[input]||'0');
    // Reserve a conservative 0.25 EGLD for gas; final preparation checks the exact cap.
    const available=input==='EGLD'?balance-250000000000000000n:balance;
    if(available<=0n){setStatus('Leave enough EGLD in your wallet for network fees.');return;}
    invalidate();setAmount(human(available,inDecimals));
  }
  return <div className="bonez-page">
    <header><a className="brand" href="/">PITTZ<span>STOP</span><small>WELCOME TO THE PACK</small></a><nav><a href="/#explorer">Explore Pittz</a><a className="active" href="#swap">Token Swap</a></nav><button className="wallet-button" disabled={busy} onClick={account.address?async()=>{invalidate();await getAccountProvider().logout();}:connect}>{account.address?account.address.slice(0,7)+'…'+account.address.slice(-4)+' · Disconnect':'Connect wallet'}</button></header>
    <main><section className="story"><div className="eyebrow"><span/>THE CURRENCY OF THE PITTZ</div><h1>You earn,<br/><em>we burn!</em></h1><p className="intro">More than a token. Part of the pack.<br/>BONEZ and beyond. Swap with the pack.</p><div className="coin-scene"><div className="orbit"/><div className="coin"><img src={logo} alt="BONEZ logo"/></div><div className="spark s1">✦</div><div className="spark s2">✧</div><div className="coin-caption">BONEZ <span>•</span> CRYPTOPITTZ</div></div><div className="story-foot"><span>ON MULTIVERSX</span><span>ROUTES BY JEX</span><span>BUILT FOR THE PACK</span></div></section>
    <section className="swap-card" id="swap"><div className="card-heading"><div><div className="eyebrow">FUEL THE PACK</div><h2>Swap tokens</h2></div><span className="network"><i/> Mainnet</span></div><div className="wallet-note">{account.address?'Your wallet. Your currencies.':'Welcome to the pack.'}<br/><span>{account.address?'Review every swap, then sign in your wallet.':'Connect your wallet to swap, or start with a quote.'}</span></div>
    <form onSubmit={getQuote}><div className="amount-box"><label htmlFor="amount">You pay</label><div className="amount-row"><input id="amount" inputMode="decimal" value={amount} disabled={busy} onChange={e=>{invalidate();setAmount(e.target.value);}} autoComplete="off"/><TokenPicker value={input} label="You pay" disabled={busy} onChange={id=>{invalidate();if(id===output)setOutput(input);setInput(id);setAmount(id==='EGLD'?'0.01':'1');}}/></div><small>{balances?`Balance: ${displayAmount(balances[input]||'0',inDecimals)} ${payToken.symbol}`:'Connect to see your balance'} {balances&&<button type="button" className="max-button" disabled={busy} onClick={max}>MAX</button>}</small></div><button className="direction" type="button" disabled={busy} aria-label="Reverse swap direction" onClick={()=>{invalidate();setInput(output);setOutput(input);setAmount(output==='EGLD'?'0.01':'1');}}>↓</button>
    <div className="amount-box receive"><label>You receive <span>estimated</span></label><div className="amount-row"><output title={quote?human(quote.q.net_amount_out,outDecimals):undefined}>{quote?displayAmount(quote.q.net_amount_out,outDecimals):'—'}</output><TokenPicker value={output} label="You receive" disabled={busy} onChange={id=>{invalidate();if(id===input){setInput(output);setAmount(output==='EGLD'?'0.01':'1');}setOutput(id);}}/></div><small>{quote?'Live quote · expires after 30 seconds':'A fresh quote for your next move'}</small></div>
    <div className="settings"><label htmlFor="slippage">Slippage tolerance</label><select id="slippage" value={slippage} disabled={busy} onChange={e=>{setSlippage(Number(e.target.value));setReview(null);}}><option value={50}>0.5%</option><option value={100}>1%</option><option value={200}>2%</option></select></div>
    {quote&&<div id="details"><div><span>Minimum received</span><strong>{displayAmount(minimum(quote.q,slippage),outDecimals)} {receiveToken.symbol}</strong></div><div><span>Aggregator fee</span><strong>{displayAmount(quote.q.fee_amount,getToken(quote.q.fee_token).decimals)} {getToken(quote.q.fee_token).symbol}</strong></div><div><span>Estimated network fee</span><strong>{displayAmount(quote.q.estimated_tx_fee_egld,18)} EGLD</strong></div><div><span>Route</span><strong>{[quote.q.route.token_in,...quote.q.route.hops.map(h=>h.token_out)].map(t=>t.split('-')[0]).join(' → ')}</strong></div></div>}
    <button className="gold-button" type="submit" disabled={busy}>{busy?'Please wait…':quote?'Refresh quote':'Get live quote'}<span>↗</span></button>
    {quote&&!review&&<button className="gold-button swap-action" type="button" disabled={busy} onClick={account.address?prepare:connect}>{account.address?'Review swap':'Connect wallet to swap'} <span>→</span></button>}
    {review&&<div className="swap-review"><h3>Confirm your swap</h3><p>You pay <strong>{displayAmount(review.amount,inDecimals)} {payToken.symbol}</strong></p><p>You receive at least <strong>{displayAmount(minimum(review.q,review.slippage),outDecimals)} {receiveToken.symbol}</strong></p><p>Maximum network fee <strong>{displayAmount(review.feeCap,18)} EGLD</strong></p><small>Network fees apply even if the swap fails.</small><button type="button" className="gold-button swap-action" disabled={busy} onClick={sign}>Approve in wallet <span>→</span></button><button type="button" className="cancel-review" disabled={busy} onClick={()=>setReview(null)}>Back</button></div>}
    <p id="status" role="status" aria-live="polite">{status}</p>
    {sent?.hash&&<a className="transaction-link" href={`https://explorer.multiversx.com/transactions/${sent.hash}`} target="_blank" rel="noreferrer">{confirmed?'✦ Swap confirmed':'View your transaction'} ↗</a>}
    </form><div className="card-foot"><span>✦</span> PittzStop Swap · MultiversX mainnet<p>Real tokens. Separate from your game Bonez balance.</p></div></section></main>
    <footer><span>PITTZSTOP <b>✦</b> THE PACK'S HOME BASE</span><span>You earn, we burn!</span></footer>
    <div className={overlay?'swap-wallet-overlay':'swap-wallet-hidden'} role={overlay?'dialog':undefined} aria-modal={overlay||undefined} aria-label="Connect xPortal">{overlay&&<button onClick={()=>{setOverlay(false);anchor.current?.replaceChildren();}}>Close</button>}<div ref={anchor}/></div>
    </div>;
}
