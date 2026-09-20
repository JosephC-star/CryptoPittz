import { useEffect, useState } from "react";

import { BONEZ_DEXSCREENER_URL, BONEZ_TOKEN_ID } from "../../config/collections";
import { buildBonezChart } from "../../utils/chartUtils";

function useBonezMarket() {
  const [market, setMarket] = useState(null);
  const [marketLoading, setMarketLoading] = useState(true);
  const [marketError, setMarketError] = useState("");
  const [marketUpdated, setMarketUpdated] = useState(null);
  const [marketStatus, setMarketStatus] = useState("checking");
  const [hourlyHistory, setHourlyHistory] = useState([]);
  const [dailyHistory, setDailyHistory] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState("");
  const [chartRange, setChartRange] = useState("24h");

  useEffect(() => {
    let cancelled = false;

    async function fetchDailyHistory() {
      try {
        const response = await fetch(
          `https://api.multiversx.com/mex/tokens/prices/daily/${BONEZ_TOKEN_ID}`,
        );
        if (!response.ok) throw new Error("Unable to load BONEZ daily history");
        const data = await response.json();
        if (!cancelled) setDailyHistory(data);
      } catch (error) {
        console.error("BONEZ daily history failed:", error);
      }
    }

    fetchDailyHistory();
    const interval = setInterval(fetchDailyHistory, 1_800_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let retryTimer;

    const retryDelays = [5_000, 15_000, 30_000];

    async function fetchMarket(attempt = 0) {
      try {
        if (attempt === 0) setMarketStatus((current) => current === "connected" ? current : "checking");
        const response = await fetch(BONEZ_DEXSCREENER_URL);
        if (!response.ok) {
          const error = new Error("Unable to load BONEZ market data");
          error.status = response.status;
          throw error;
        }
        const data = await response.json();
        const pair = data.pair || data.pairs?.[0];
        if (!pair) throw new Error("BONEZ market pair was not found");

        if (!cancelled) {
          setMarket(pair);
          setMarketUpdated(new Date());
          setMarketStatus("connected");
          setMarketError("");
          setMarketLoading(false);
          retryTimer = window.setTimeout(() => fetchMarket(0), 60_000);
        }
      } catch (error) {
        console.error("BONEZ market lookup failed:", error);
        if (cancelled) return;

        setMarketLoading(false);

        if (attempt < retryDelays.length) {
          setMarketStatus("busy");
          setMarketError("");
          retryTimer = window.setTimeout(
            () => fetchMarket(attempt + 1),
            retryDelays[attempt],
          );
        } else {
          setMarketStatus("unavailable");
          setMarketError(
            "Live BONEZ pricing is temporarily unavailable. The site and blockchain may still be operating normally.",
          );
          retryTimer = window.setTimeout(() => fetchMarket(0), 60_000);
        }
      }
    }

    fetchMarket();

    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchHourlyHistory() {
      try {
        setChartError("");
        const response = await fetch(
          `https://api.multiversx.com/mex/tokens/prices/hourly/${BONEZ_TOKEN_ID}`,
        );
        if (!response.ok) throw new Error("Unable to load BONEZ price history");
        const data = await response.json();
        if (!cancelled) setHourlyHistory(data);
      } catch (error) {
        console.error("BONEZ price history failed:", error);
        if (!cancelled) setChartError("BONEZ chart data is temporarily unavailable.");
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    }

    fetchHourlyHistory();
    const interval = setInterval(fetchHourlyHistory, 300_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const activeHistory =
    chartRange === "24h"
      ? hourlyHistory.slice(-24)
      : chartRange === "7d"
        ? dailyHistory.slice(-7)
        : dailyHistory.slice(-30);
  const chart = buildBonezChart(activeHistory);
  const chartChange =
    chart?.first?.value && chart?.last?.value
      ? ((chart.last.value - chart.first.value) / chart.first.value) * 100
      : null;

  return {
    market,
    marketLoading,
    marketError,
    marketStatus,
    marketUpdated,
    chart,
    chartLoading,
    chartError,
    chartRange,
    chartChange,
    setChartRange,
  };
}

export default useBonezMarket;
