import { EXPLORER_COLLECTIONS } from "../config/collections";

const EMPTY_PITTZ_STATS = {
  type: "",
  bloodline: "",
  score: "",
  rank: "",
};

export function decodePittzAttributes(encodedAttributes) {
  if (!encodedAttributes) return [];

  try {
    const decoded = atob(encodedAttributes);

    return decoded
      .split(";")
      .filter((item) => item.includes(":"))
      .map((item) => {
        const [trait, ...valueParts] = item.split(":");

        return {
          trait: trait.trim(),
          value: valueParts.join(":").trim(),
        };
      })
      .filter((item) => item.trait !== "metadata" && item.trait !== "tags");
  } catch (error) {
    console.error("Unable to decode NFT attributes:", error);
    return [];
  }
}

export function getPittzStats(encodedAttributes) {
  if (!encodedAttributes) return { ...EMPTY_PITTZ_STATS };

  try {
    const decoded = atob(encodedAttributes);
    const tagsSection = decoded.split(";").find((item) => item.startsWith("tags:"));

    if (!tagsSection) return { ...EMPTY_PITTZ_STATS };

    const tags = tagsSection.replace("tags:", "").split(",");
    const getTagValue = (prefix) => {
      const tag = tags.find((item) => item.startsWith(prefix));
      return tag ? tag.replace(prefix, "") : "";
    };

    return {
      type: getTagValue("Type-"),
      bloodline: getTagValue("Bloodline-"),
      score: getTagValue("PointScore-"),
      rank: getTagValue("Rank-"),
    };
  } catch (error) {
    console.error("Unable to decode CryptoPittz stats:", error);
    return { ...EMPTY_PITTZ_STATS };
  }
}

export function getNftMarketplace(nft) {
  if (!nft?.identifier || !nft?.collection) {
    return EXPLORER_COLLECTIONS.original.marketplace;
  }

  const collectionUrl =
    nft.collection === EXPLORER_COLLECTIONS.vice.collection
      ? EXPLORER_COLLECTIONS.vice.marketplace
      : EXPLORER_COLLECTIONS.original.marketplace;

  return `${collectionUrl}?nftId=${encodeURIComponent(nft.identifier)}`;
}

export function getNftImage(nft) {
  return (
    nft?.media?.[0]?.thumbnailUrl ||
    nft?.media?.[0]?.url ||
    nft?.url ||
    nft?.media?.[0]?.originalUrl ||
    nft?.metadata?.image ||
    ""
  );
}

export function getCollectionBadge(nft) {
  if (nft?.collection === EXPLORER_COLLECTIONS.vice.collection) {
    return { label: "VICE PITTZ", className: "vice-badge" };
  }

  return { label: "ORIGINAL PITTZ", className: "original-badge" };
}
