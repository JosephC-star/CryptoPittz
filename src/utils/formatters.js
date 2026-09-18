export function formatBonezUsd(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "—";

  return number.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: number < 0.01 ? 7 : 2,
    maximumFractionDigits: number < 0.01 ? 7 : 2,
  });
}

export function formatMarketNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "—";

  return number.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}
