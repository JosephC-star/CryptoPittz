export const STARTING_PITTZ_POINTS = 1000;
export const PACK_REFILL_POINTS = 250;
export const MINIMUM_STAKE = 10;
export const PITTZ_POINTS_KEY = "cryptopittz-palace-pittz-points";
export const PALACE_STAKES = [10, 25, 50];
export const PACK_METER_GOAL = 5;
export const PALACE_COLLECTION_POOLS = [
  { collection: "PITTZ-1a4c2d", total: 5310 },
  { collection: "PITTZVICE-c3ec94", total: 1395 },
];
export const PALACE_BATCH_SIZE = 4;
export const PALACE_BATCHES_PER_COLLECTION = 3;

export const DOG_CATCHER = {
  id: "dog-catcher",
  name: "Dog Catcher",
  emoji: "🚨",
  special: "dog-catcher",
  isHazard: true,
  isWild: false,
};

export const MUZZLE = {
  id: "muzzle",
  name: "Muzzle",
  emoji: "🚫",
  special: "muzzle",
  isHazard: true,
  isWild: false,
};

export function pickRandom(items, excludedId = "") {
  const choices = items.filter((item) => item.id !== excludedId);
  return choices[Math.floor(Math.random() * choices.length)] || items[0];
}

export function createSpinOutcome(symbols, packMode = false) {
  const wild = symbols.find((symbol) => symbol.isWild);
  const dogCatcher = symbols.find((symbol) => symbol.special === "dog-catcher");
  const muzzle = symbols.find((symbol) => symbol.special === "muzzle");
  const pittz = symbols.filter((symbol) => !symbol.isWild && !symbol.isHazard);
  const roll = Math.random();

  if (packMode) {
    const packPitt = pickRandom(pittz);
    return Math.random() < 0.4
      ? [wild, wild, packPitt].sort(() => Math.random() - 0.5)
      : [packPitt, packPitt, pickRandom(pittz, packPitt.id)].sort(() => Math.random() - 0.5);
  }

  if (roll < 0.025) {
    const jackpotPitt = pickRandom(pittz);
    return [jackpotPitt, jackpotPitt, jackpotPitt];
  }

  if (roll < 0.15) {
    const pair = pickRandom(pittz);
    return Math.random() < 0.36
      ? [pair, wild, pair]
      : [pair, pair, pickRandom(pittz, pair.id)].sort(() => Math.random() - 0.5);
  }

  if (roll < 0.27) {
    return [pickRandom(pittz), dogCatcher, pickRandom(pittz)].sort(() => Math.random() - 0.5);
  }

  if (roll < 0.37) {
    return [muzzle, pickRandom(pittz), pickRandom(pittz)].sort(() => Math.random() - 0.5);
  }

  return Array.from({ length: 3 }, () =>
    Math.random() < 0.03 ? wild : pickRandom(pittz),
  );
}

export function evaluateSpin(symbols, stake, packMode = false) {
  const dogCatchers = symbols.filter((symbol) => symbol.special === "dog-catcher").length;
  const muzzles = symbols.filter((symbol) => symbol.special === "muzzle").length;
  const wildCount = symbols.filter((symbol) => symbol.isWild).length;
  const pittz = symbols.filter((symbol) => !symbol.isWild && !symbol.isHazard);
  const ids = pittz.map((symbol) => symbol.id);
  const counts = ids.reduce((total, id) => ({ ...total, [id]: (total[id] || 0) + 1 }), {});
  const highestMatch = Math.max(0, ...Object.values(counts));
  const sharedTrait = (trait) =>
    pittz.length === 3 && pittz[0][trait] && pittz.every((symbol) => symbol[trait] === pittz[0][trait]);

  let multiplier = 0;
  let penalty = 0;
  let title = "NO MATCH";
  let message = "The Palace keeps these BONEZ. Spin it back!";

  if (dogCatchers > 0) {
    penalty = stake * dogCatchers;
    title = "DOG CATCHER! 🚨";
    message = `The dog catcher confiscated ${penalty} extra BONEZ!`;
  } else if (muzzles > 0) {
    penalty = Math.ceil(stake * 0.5 * muzzles);
    title = "MUZZLED! 🚫";
    message = `The muzzle penalty cost ${penalty} extra BONEZ.`;
  } else if (wildCount === 3) {
    multiplier = 15;
    title = "GOLDEN BONEZ MEGA JACKPOT!";
    message = "Three wild BONEZ just lit up the entire Palace!";
  } else if (wildCount === 2 && pittz.length === 1) {
    title = "BONEZ VAULT UNLOCKED!";
    message = "Choose one neon vault to reveal your Pack Mode reward.";
  } else if ((highestMatch === 2 && wildCount === 1) || highestMatch === 3) {
    multiplier = wildCount ? 5 : 8;
    title = "EXTRA MUSTY JACKPOT!";
    message = "Three matching Pittz! The pack has lost all adult supervision.";
  } else if (highestMatch === 2) {
    multiplier = packMode ? 2 : 1.5;
    title = packMode ? "PACK POWER PAIR!" : "DOUBLE PITTZ!";
    message = packMode ? "Pack Mode boosted this pair to double BONEZ." : "Two matching Pittz earn a 1.5× payout.";
  } else if (sharedTrait("bloodline")) {
    multiplier = 3;
    title = "BLOODLINE BONUS!";
    message = `Three ${pittz[0].bloodline} Pittz landed together.`;
  } else if (sharedTrait("type")) {
    multiplier = 2;
    title = "TYPE TRIPLE!";
    message = `Three ${pittz[0].type} Pittz take the payline.`;
  } else if (wildCount > 0) {
    multiplier = 0.5;
    title = "WILD BONEZ SAVE!";
    message = "Golden BONEZ rescued half your wager.";
  }

  return {
    multiplier,
    payout: Math.round(stake * multiplier),
    penalty,
    title,
    message,
    bonus: wildCount === 2 && pittz.length === 1 ? "vault" : null,
  };
}
