export const GAME_DURATION = 30;
export const STARTING_LIVES = 3;
export const SPAWN_INTERVAL = 560;
export const BONEZ_RUSH_HIGH_SCORE_KEY = "cryptopittz-bonez-rush-high-score";

export const RUSH_ITEMS = [
  { type: "bone", symbol: "🦴", label: "BONEZ", points: 10, chance: 0.66 },
  { type: "golden", symbol: "🦴", label: "Golden BONEZ", points: 30, chance: 0.16 },
  { type: "steak", symbol: "🥩", label: "Power steak", points: 20, chance: 0.11 },
  { type: "hazard", symbol: "💀", label: "Bad bone", points: -15, chance: 0.07 },
];

export const COMBO_TIERS = [
  { minimum: 10, multiplier: 3, name: "EXTRA MUSTY!", className: "extra-musty" },
  { minimum: 5, multiplier: 2, name: "WOOF WOOF!", className: "woof-woof" },
  { minimum: 0, multiplier: 1, name: "Fresh Trail", className: "fresh-trail" },
];

export function getComboTier(combo) {
  return COMBO_TIERS.find((tier) => combo >= tier.minimum) || COMBO_TIERS.at(-1);
}

export function createRushItem(id) {
  const roll = Math.random();
  let chanceTotal = 0;
  const itemType =
    RUSH_ITEMS.find((item) => {
      chanceTotal += item.chance;
      return roll <= chanceTotal;
    }) || RUSH_ITEMS[0];

  return {
    ...itemType,
    id,
    x: 4 + Math.random() * 88,
    drift: -35 + Math.random() * 70,
    rotation: -35 + Math.random() * 70,
    duration: 2.8 + Math.random() * 1.5,
  };
}
