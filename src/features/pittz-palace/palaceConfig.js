export const STARTING_PITTZ_POINTS = 1000;
export const PACK_REFILL_POINTS = 250;
export const MINIMUM_STAKE = 10;
export const PITTZ_POINTS_KEY = "cryptopittz-palace-pittz-points";
export const PALACE_STAKES = [10, 25, 50];

export function pickRandom(items, excludedId = "") {
  const choices = items.filter((item) => item.id !== excludedId);
  return choices[Math.floor(Math.random() * choices.length)] || items[0];
}

export function createSpinOutcome(symbols) {
  const wild = symbols.find((symbol) => symbol.isWild);
  const pittz = symbols.filter((symbol) => !symbol.isWild);
  const roll = Math.random();

  if (roll < 0.045) {
    const jackpotPitt = pickRandom(pittz);
    return [jackpotPitt, jackpotPitt, jackpotPitt];
  }

  if (roll < 0.18) {
    const pair = pickRandom(pittz);
    return Math.random() < 0.3
      ? [pair, wild, pair]
      : [pair, pair, pickRandom(pittz, pair.id)].sort(() => Math.random() - 0.5);
  }

  if (roll < 0.29) {
    const collection = Math.random() < 0.5 ? "PITTZ-1a4c2d" : "PITTZVICE-c3ec94";
    const collectionPittz = pittz.filter((symbol) => symbol.collection === collection);
    return Array.from({ length: 3 }, () => pickRandom(collectionPittz));
  }

  return Array.from({ length: 3 }, () =>
    Math.random() < 0.06 ? wild : pickRandom(pittz),
  );
}

export function evaluateSpin(symbols, stake) {
  const wildCount = symbols.filter((symbol) => symbol.isWild).length;
  const pittz = symbols.filter((symbol) => !symbol.isWild);
  const ids = pittz.map((symbol) => symbol.id);
  const counts = ids.reduce((total, id) => ({ ...total, [id]: (total[id] || 0) + 1 }), {});
  const highestMatch = Math.max(0, ...Object.values(counts));
  const sharedTrait = (trait) =>
    pittz.length === 3 && pittz[0][trait] && pittz.every((symbol) => symbol[trait] === pittz[0][trait]);

  let multiplier = 0;
  let title = "NO MATCH";
  let message = "The Palace keeps these Pittz Points. Spin it back!";

  if (wildCount === 3) {
    multiplier = 20;
    title = "GOLDEN BONEZ MEGA JACKPOT!";
    message = "Three wild BONEZ just lit up the entire Palace!";
  } else if ((highestMatch === 2 && wildCount === 1) || highestMatch === 3) {
    multiplier = wildCount ? 8 : 10;
    title = "EXTRA MUSTY JACKPOT!";
    message = "Three matching Pittz! The pack has lost all adult supervision.";
  } else if (highestMatch === 2) {
    multiplier = 2;
    title = "DOUBLE PITTZ!";
    message = "Two matching Pittz pay double Pittz Points.";
  } else if (sharedTrait("bloodline")) {
    multiplier = 4;
    title = "BLOODLINE BONUS!";
    message = `Three ${pittz[0].bloodline} Pittz landed together.`;
  } else if (sharedTrait("type")) {
    multiplier = 3;
    title = "TYPE TRIPLE!";
    message = `Three ${pittz[0].type} Pittz take the payline.`;
  } else if (sharedTrait("collection")) {
    multiplier = 1.5;
    title = pittz[0].collection === "PITTZVICE-c3ec94" ? "VICE NIGHT!" : "ORIGINAL PACK!";
    message = "Three from the same collection earn a pack bonus.";
  } else if (wildCount > 0) {
    multiplier = 1;
    title = "WILD BONEZ REFUND!";
    message = "Golden BONEZ returns your Pittz Points for another spin.";
  }

  return {
    multiplier,
    payout: Math.round(stake * multiplier),
    title,
    message,
  };
}
