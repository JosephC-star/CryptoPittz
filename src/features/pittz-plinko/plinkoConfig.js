export const ROWS = 12;
export const RISKS = {
  low: { label: "Low", description: "Gentler swings • smaller edge rewards", payouts: [12, 5, 2, 1.4, 1.1, 0.8, 0.5, 0.8, 1.1, 1.4, 2, 5, 12] },
  medium: { label: "Medium", description: "Bigger swings • chase the outside slots", payouts: [50, 15, 5, 2, 0.7, 0.4, 0.2, 0.4, 0.7, 2, 5, 15, 50] },
  high: { label: "High", description: "Wild swings • center slot pays zero", payouts: [150, 35, 8, 2, 0.4, 0.1, 0, 0.1, 0.4, 2, 8, 35, 150] },
};
export function pegPosition(row, column) {
  return { x: 300 + (column - row / 2) * 48, y: 88 + row * 34 };
}
export function createDrop(risk, stake, chute = 1, random = Math.random) {
  let column = 0;
  const path = [{ x: 260 + chute * 40, y: 26 }];
  for (let row = 0; row < ROWS; row += 1) {
    const peg = pegPosition(row, column);
    path.push({ ...peg, y: peg.y - 12, peg: `${row}-${column}` });
    if (random() >= 0.5) column += 1;
  }
  path.push({ x: 12 + column * 48, y: 530 });
  const multiplier = RISKS[risk].payouts[column];
  return { path, slot: column, multiplier, payout: Math.round(stake * multiplier), stake, risk };
}
