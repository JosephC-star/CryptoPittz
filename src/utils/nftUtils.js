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

export function getPittzTraits(encodedAttributes) {
  if (!encodedAttributes) return [];

  try {
    const decoded = atob(encodedAttributes);
    const traits = [];
    const addTrait = (trait, value) => {
      const cleanTrait = trait.trim();
      const cleanValue = value.trim();
      if (!cleanTrait || !cleanValue || ["Rank", "PointScore"].includes(cleanTrait)) return;
      if (!traits.some((item) => item.trait === cleanTrait && item.value === cleanValue)) {
        traits.push({ trait: cleanTrait, value: cleanValue });
      }
    };

    decoded.split(";").forEach((section) => {
      if (section.startsWith("tags:")) {
        section.replace("tags:", "").split(",").forEach((tag) => {
          const separator = tag.indexOf("-");
          if (separator > 0) addTrait(tag.slice(0, separator), tag.slice(separator + 1));
        });
        return;
      }

      if (section.startsWith("metadata:")) return;
      const separator = section.indexOf(":");
      if (separator > 0) addTrait(section.slice(0, separator), section.slice(separator + 1));
    });

    return traits;
  } catch (error) {
    console.error("Unable to decode CryptoPittz traits:", error);
    return [];
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
  const primaryMedia = nft?.media?.[0];
  const mediaType = primaryMedia?.fileType?.toLowerCase() || "";
  const mediaUrl = primaryMedia?.url || primaryMedia?.originalUrl || "";
  const isVicePittz = nft?.collection === EXPLORER_COLLECTIONS.vice.collection;
  const isAnimatedImage =
    mediaType === "image/gif" || /\.(gif|apng)(?:[?#].*)?$/i.test(mediaUrl);

  // Vice Secret and Holo GIFs are served from an unreliable origin. Prefer
  // MultiversX's generated still thumbnail for every Vice Pittz so the cards
  // remain visible throughout the explorer, wallet, and games.
  if (isVicePittz) {
    return (
      primaryMedia?.thumbnailUrl ||
      nft?.url ||
      primaryMedia?.url ||
      primaryMedia?.originalUrl ||
      nft?.metadata?.image ||
      ""
    );
  }

  // MultiversX thumbnails are static, so use the collection's original media
  // for animated Original artwork while keeping lightweight thumbnails for
  // regular Pittz.
  if (isAnimatedImage) return mediaUrl;

  return (
    primaryMedia?.thumbnailUrl ||
    primaryMedia?.url ||
    nft?.url ||
    primaryMedia?.originalUrl ||
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
