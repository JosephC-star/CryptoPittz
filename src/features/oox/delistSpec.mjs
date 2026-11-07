import {CONTRACT as OOX} from './validation.js';
import {CONTRACT as XOXNO, hex} from '../xoxno/validation.js';

export function delistSpec(marketplace, listing, address) {
  const match = /^(PITTZ-1a4c2d|PITTZVICE-c3ec94)-([a-f0-9]{1,16})$/.exec(listing.identifier);
  if (!match || BigInt('0x' + match[2]) === 0n || listing.seller !== address ||
      !Number.isSafeInteger(listing.auctionId) || listing.auctionId < 1) {
    throw Error('This listing does not match your wallet and Pitt.');
  }
  if (marketplace !== 'OOX' && marketplace !== 'XOXNO') throw Error('Unsupported marketplace.');
  const oox = marketplace === 'OOX';
  // XOXNO's withdraw endpoint retains an unused signature argument.
  return {
    sender: address, receiver: oox ? OOX : XOXNO, value: '0',
    gasLimit: oox ? 11000000 : 45000000, gasPrice: 1000000000, chainID: '1', version: 2,
    data: `withdraw@${oox ? '' : '@'}${hex(listing.auctionId)}`,
  };
}

export function matchesWithdrawal(events, spec, listing, walletBytes) {
  const [collection, nonce] = listing.identifier.match(/^(.*)-([a-f0-9]+)$/).slice(1);
  const uint = value => {
    const bytes = atob(value);
    return Array.from(bytes).reduce((n, byte) => n * 256n + BigInt(byte.charCodeAt(0)), 0n);
  };
  return !events.some(event => event.identifier === 'signalError') && events.some(event => {
    const t = event.topics;
    return event.address === spec.receiver && event.identifier === 'withdraw' &&
      t?.length >= 6 && atob(t[0]) === 'withdraw_event' && atob(t[1]) === collection &&
      uint(t[2]) === BigInt('0x' + nonce) && uint(t[3]) === BigInt(listing.auctionId) &&
      uint(t[4]) === 1n && t[5] === walletBytes;
  });
}
