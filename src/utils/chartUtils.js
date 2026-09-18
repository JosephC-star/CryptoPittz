export function buildBonezChart(data) {
  if (!data?.length) return null;

  const width = 800;
  const height = 220;
  const paddingX = 18;
  const paddingY = 22;
  const values = data.map((item) => Number(item.value));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;
  const safeRange = range === 0 ? Math.max(maxValue * 0.02, 0.00000001) : range;
  const paddedMin = minValue - safeRange * 0.18;
  const paddedMax = maxValue + safeRange * 0.18;
  const chartRange = paddedMax - paddedMin;

  const points = data.map((item, index) => {
    const x = paddingX + (index / Math.max(data.length - 1, 1)) * (width - paddingX * 2);
    const y =
      height - paddingY - ((Number(item.value) - paddedMin) / chartRange) * (height - paddingY * 2);

    return { x, y, value: Number(item.value), timestamp: item.timestamp };
  });

  return {
    width,
    height,
    points,
    polyline: points.map((point) => `${point.x},${point.y}`).join(" "),
    min: minValue,
    max: maxValue,
    first: points[0],
    last: points[points.length - 1],
  };
}
