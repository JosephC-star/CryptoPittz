import { BONEZ_RATES } from "../config/bonezRates";
import { EXPLORER_COLLECTIONS } from "../config/collections";
import { getPittzStats } from "./nftUtils";

export function getBonezTier(nft) {
  const stats = getPittzStats(nft.attributes);
  const rank = Number(stats.rank);

  if (!rank) return null;

  const isVice = nft.collection === EXPLORER_COLLECTIONS.vice.collection;

  if (!isVice) {
    if (rank === 1) return "Secret Rare";
    if (rank === 2) return "Holoz";
    if (rank === 3) return "Lego";
    if (rank >= 4 && rank <= 451) return "Platinum";
    if (rank >= 452 && rank <= 1245) return "Gold";
    if (rank >= 1246 && rank <= 3195) return "Silver";
    if (rank >= 3196 && rank <= 6999) return "Bronze";
    return null;
  }

  if (rank === 1) return "Secret Rare";
  if (rank === 2) return "Holoz";
  if (rank === 3) return "Lego";
  if (rank >= 4 && rank <= 104) return "Platinum";
  if (rank >= 105 && rank <= 288) return "Gold";
  if (rank >= 289 && rank <= 701) return "Silver";
  if (rank >= 702 && rank <= 1337) return "Bronze";
  return null;
}

export function getBonezGeneration(nft) {
  const tier = getBonezTier(nft);
  if (!tier) return null;

  const collectionType =
    nft.collection === EXPLORER_COLLECTIONS.vice.collection ? "vice" : "original";
  const rates = BONEZ_RATES[collectionType][tier];

  if (!rates) return null;

  return {
    tier,
    daily: rates.daily,
    weekly: rates.weekly,
    monthly: rates.daily * 30,
  };
}

export function getBonezWalletTotals(nfts) {
  return nfts.reduce(
    (totals, nft) => {
      const bonez = getBonezGeneration(nft);
      if (!bonez) return totals;

      totals.daily += bonez.daily;
      totals.weekly += bonez.weekly;
      totals.monthly += bonez.monthly;
      totals.pittz += 1;
      return totals;
    },
    { daily: 0, weekly: 0, monthly: 0, pittz: 0 },
  );
}
