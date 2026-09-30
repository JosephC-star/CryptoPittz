const ALLOWED_COLLECTIONS = new Set(["PITTZ-1a4c2d", "PITTZVICE-c3ec94"]);
const OOX_LISTINGS_URL = "https://www.oox.art/api/nfts";
const PAGE_SIZE = 100;

function json(statusCode, body, cacheControl = "no-store") {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheControl,
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  const collection = event.queryStringParameters?.collection || "";

  if (!ALLOWED_COLLECTIONS.has(collection)) {
    return json(400, { error: "Unsupported CryptoPittz collection." });
  }

  try {
    const listings = [];

    for (let page = 0; page < 20; page += 1) {
      const params = new URLSearchParams({
        source: "collection-all",
        collectionId: collection,
        status: "listed",
        sort: "priceAsc",
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      const response = await fetch(`${OOX_LISTINGS_URL}?${params}`);

      if (!response.ok) throw new Error(`OOX returned ${response.status}`);

      const pageListings = await response.json();
      if (!Array.isArray(pageListings)) throw new Error("OOX returned an invalid listing feed");

      listings.push(...pageListings);
      if (pageListings.length < PAGE_SIZE) break;
    }

    const currentListings = listings
      .filter((listing) => listing?.identifier && Number(listing?.price) > 0)
      .map((listing) => ({
        identifier: listing.identifier,
        price: String(listing.price),
        paymentToken: listing.buyTokenId || "EGLD",
        dollarValue: Number(listing.dollarValue) || null,
        auctionId: listing.auctionId || null,
      }));

    return json(
      200,
      { collection, listings: currentListings, updatedAt: new Date().toISOString() },
      "public, max-age=15, s-maxage=30, stale-while-revalidate=60",
    );
  } catch (error) {
    console.error("OOX listing lookup failed:", error);
    return json(502, { error: "OOX listings are temporarily unavailable." });
  }
}
