import { useEffect, useRef, useState } from 'react';
import { Address } from '@multiversx/sdk-core';
import { OOXClient, formatAmount } from '@oox-marketplace/sdk';
import { readListingItems } from './listingResponse';
import { CONTRACT, validateListing, validateQuote } from './validation';
import './preview.css';
const client = new OOXClient({ network: 'mainnet', marketplaceContract: CONTRACT });
async function json(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw Error(`Network request failed (${response.status}).`);
  return response.json();
}
export default function OoxPurchasePreview({ nft }) {
  const [listing, setListing] = useState(null);
  const [buyer, setBuyer] = useState('');
  const [message, setMessage] = useState('Checking OOX listing…');
  const [details, setDetails] = useState(null);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  useEffect(() => {
    let active = true;
    client.api.getListings({ identifiers: [nft.identifier], size: 20 }).then((page) => {
      if (!active) return;
      const items = readListingItems(page);
      const match = items.find(item => item.priceType === 'fixed' && item.saleType === 'nft' && item.paymentToken === 'EGLD');
      if (!match) { setMessage(items.length ? 'OOX returned a listing, but this preview supports fixed-price EGLD NFT purchases only. Use View on OOX to check other sale types.' : 'OOX’s purchase API returned no listing for this Pitt. The Explorer sale badge may use different or older listing data. Check View on OOX; simulation is unavailable until the purchase API returns a listing.'); return; }
      validateListing(match, nft);
      setListing(match); setMessage('Listing loaded. No purchase can be sent from this preview.');
    }).catch(error => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [nft]);
  async function simulate() {
    if (locked.current) return;
    locked.current = true; setBusy(true); setDetails(null);
    try {
      const address = Address.newFromBech32(buyer.trim()).toBech32();
      validateListing(listing, nft, address);
      setMessage('Checking fresh quote and account…');
      const config = await client.api.getConfig();
      if (config.chainId !== '1' || config.network !== 'mainnet' || config.marketplaceContract !== CONTRACT) throw Error('OOX network configuration mismatch.');
      const accountResponse = await json(`https://gateway.multiversx.com/address/${address}`);
      const account = accountResponse.data?.account;
      if (!Number.isSafeInteger(account?.nonce) || account.nonce < 0) throw Error('Cannot verify account nonce.');
      const { quote, transaction } = await client.prepareBuy({ buyer: address, auctionId: listing.auctionId, nonce: BigInt(account.nonce) });
      validateQuote(quote, listing, nft, address);
      const payload = transaction.toSendable();
      const command = atob(payload.data || '');
      const expected = `buy@${listing.auctionId.toString(16).padStart(Math.ceil(listing.auctionId.toString(16).length / 2) * 2, '0')}@${Array.from(new TextEncoder().encode(listing.collection), b => b.toString(16).padStart(2, '0')).join('')}@${listing.nonce.toString(16).padStart(Math.ceil(listing.nonce.toString(16).length / 2) * 2, '0')}`;
      if (payload.sender !== address || payload.receiver !== CONTRACT || payload.chainID !== '1' || payload.value !== quote.totalPrice || command !== expected || payload.gasLimit !== 16000000 || payload.gasPrice !== 1000000000) throw Error('Generated transaction failed verification.');
      const feeCap = BigInt(payload.gasLimit) * BigInt(payload.gasPrice);
      if (BigInt(account.balance) < BigInt(quote.totalPrice) + feeCap) throw Error('This address needs enough mainnet EGLD for the price and fee cap to simulate successfully. Nothing has been spent.');
      setDetails({ nft: nft.identifier, price: `${formatAmount(quote.totalPrice, 18)} EGLD`, receiver: CONTRACT, chainID: payload.chainID, data: command, nonce: payload.nonce, gasLimit: payload.gasLimit });
      setMessage('Simulating only—no signing or broadcast…');
      const result = await json('https://gateway.multiversx.com/transaction/simulate?checkSignature=false', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, signature: '00'.repeat(64) })
      });
      setDetails(current => ({ ...current, simulation: result }));
      setMessage('Simulation response received. It requires review, especially for cross-shard execution. No funds were spent.');
    } catch (error) { setMessage(error.message); }
    finally { locked.current = false; setBusy(false); }
  }
  return <section className="oox-preview" aria-label="OOX purchase testing">
    <strong>OOX purchase preview · Simulation only</strong>
    <p>No wallet signatures or real purchases are available here.</p>
    {listing && <><p>Listed for <strong>{formatAmount(listing.price, 18)} EGLD</strong></p>
      <label>Mainnet buyer address (public address only)<input value={buyer} disabled={busy} onChange={event => { setBuyer(event.target.value); setDetails(null); }} placeholder="erd1…" autoComplete="off" /></label>
      <button className="btn primary" type="button" disabled={busy || !buyer.trim()} onClick={simulate}>{busy ? 'Checking…' : 'Validate & simulate purchase'}</button></>}
    <p role="status">{message}</p>
    {details && <details><summary>Transaction and simulation details</summary><pre>{JSON.stringify(details, null, 2)}</pre></details>}
  </section>;
}
