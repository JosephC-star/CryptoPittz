import {useEffect, useState} from 'react';

export default function FeaturedMarketEntrance() {
  const [shop, setShop] = useState(null);

  useEffect(() => {
    let controller;
    let disposed = false;
    async function refresh() {
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch('/.netlify/functions/market-api?route=featured', {
          cache: 'no-store', signal: controller.signal,
        });
        if (!response.ok) throw new Error('Featured shop unavailable');
        const {shop: featured} = await response.json();
        if (!disposed) setShop(featured && Number.isSafeInteger(featured.booth_number)
          && featured.booth_number > 0 && typeof featured.name === 'string'
          && featured.name.trim() ? featured : null);
      } catch (error) {
        if (!disposed && error.name !== 'AbortError') setShop(null);
      }
    }
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    refresh();
    const timer = setInterval(onVisible, 900_000);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      disposed = true;
      controller?.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return <a className="market-entrance-window" href={shop ? `/market-shop?booth=${shop.booth_number}` : '/flea-market/'}>
    <span className="market-sticker">PACK UNITY</span>
    <div className="market-shop-strip">
      <b>{shop ? `Visit ${shop.name}` : 'Visit the Flea Market'}</b>
      <span>{shop ? `Featured shop · Booth ${String(shop.booth_number).padStart(2, '0')}` : 'Discover shops made by the pack'}</span>
      <small>{shop ? 'STEP INSIDE THEIR SHOP ↗' : 'MEET THE MAKERS ↗'}</small>
    </div>
    <i className="market-sign-shimmer" aria-hidden="true" />
  </a>;
}
