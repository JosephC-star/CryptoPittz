import { formatBonezUsd, formatMarketNumber } from "../../utils/formatters";

function BonezMarketSection({
  market,
  marketLoading,
  marketError,
  marketUpdated,
  chart,
  chartLoading,
  chartError,
  chartRange,
  chartChange,
  onChartRangeChange,
}) {
  return (
    <>
      <div className="section-title">
        <span>🦴 Live Utility</span>
        <h2>BONEZ Market</h2>
        <p>Live market data for the token powering the CryptoPittz ecosystem.</p>
      </div>

      <div className="bonez-market">
        <div className="bonez-market-header">
          <div>
            <span className="bonez-market-eyebrow">🦴 Live Market</span>
            <h3>BONEZ MARKET</h3>
            <p>BONEZ / EGLD • xExchange</p>
          </div>
          <div className={`bonez-market-status ${market ? "online" : ""}`}>
            <span className="bonez-market-dot" />
            {marketLoading ? "Loading" : market ? "Live" : "Offline"}
          </div>
        </div>

        {marketLoading && !market && (
          <div className="bonez-market-loading">Connecting to BONEZ market data...</div>
        )}
        {marketError && !market && <div className="bonez-market-error">{marketError}</div>}

        {market && (
          <>
            <div className="bonez-market-price">
              <span>Current BONEZ Price</span>
              <strong>{formatBonezUsd(market.priceUsd)}</strong>
              <small>
                1 BONEZ ={" "}
                {Number(market.priceNative).toLocaleString("en-US", {
                  minimumFractionDigits: 8,
                  maximumFractionDigits: 8,
                })}{" "}
                EGLD
              </small>
            </div>

            <div className="bonez-chart">
              <div className="bonez-chart-header">
                <div>
                  <span>Price History</span>
                  <strong>
                    {chartRange === "24h"
                      ? "24H BONEZ / USD"
                      : chartRange === "7d"
                        ? "7D BONEZ / USD"
                        : "30D BONEZ / USD"}
                  </strong>
                </div>

                <div className="bonez-chart-ranges">
                  {["24h", "7d", "30d"].map((range) => (
                    <button
                      type="button"
                      className={chartRange === range ? "active" : ""}
                      onClick={() => onChartRangeChange(range)}
                      key={range}
                    >
                      {range.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div
                  className={`bonez-chart-change ${
                    chartChange > 0 ? "positive" : chartChange < 0 ? "negative" : ""
                  }`}
                >
                  {chartChange !== null
                    ? `${chartChange >= 0 ? "+" : ""}${chartChange.toFixed(2)}%`
                    : "—"}
                </div>
              </div>

              {chartLoading && !chart && (
                <div className="bonez-chart-placeholder">Loading BONEZ price history...</div>
              )}
              {chartError && !chart && (
                <div className="bonez-chart-placeholder">{chartError}</div>
              )}

              {chart && (
                <>
                  <div className="bonez-chart-stage">
                    <svg
                      viewBox={`0 0 ${chart.width} ${chart.height}`}
                      role="img"
                      aria-label={`BONEZ ${chartRange} price chart`}
                    >
                      <defs>
                        <linearGradient id="bonezChartGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#ff3df7" />
                          <stop offset="50%" stopColor="#ffd86b" />
                          <stop offset="100%" stopColor="#00e5ff" />
                        </linearGradient>
                        <filter id="bonezChartGlow">
                          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      <line x1="18" x2="782" y1="55" y2="55" className="bonez-chart-gridline" />
                      <line x1="18" x2="782" y1="110" y2="110" className="bonez-chart-gridline" />
                      <line x1="18" x2="782" y1="165" y2="165" className="bonez-chart-gridline" />
                      <polyline
                        points={chart.polyline}
                        fill="none"
                        stroke="url(#bonezChartGradient)"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter="url(#bonezChartGlow)"
                      />
                      <circle
                        cx={chart.last.x}
                        cy={chart.last.y}
                        r="6"
                        className="bonez-chart-current-dot"
                      />
                    </svg>
                  </div>
                  <div className="bonez-chart-footer">
                    <span>Low <strong>${chart.min.toFixed(7)}</strong></span>
                    <span>High <strong>${chart.max.toFixed(7)}</strong></span>
                    <span>Current <strong>${chart.last.value.toFixed(7)}</strong></span>
                  </div>
                </>
              )}
            </div>

            <div className="bonez-market-grid">
              <div className="bonez-market-stat">
                <span>24H Change</span>
                <strong>
                  {market.priceChange?.h24 !== undefined
                    ? `${Number(market.priceChange.h24).toFixed(2)}%`
                    : "—"}
                </strong>
              </div>
              <div className="bonez-market-stat">
                <span>24H Volume</span>
                <strong>{formatBonezUsd(market.volume?.h24)}</strong>
              </div>
              <div className="bonez-market-stat">
                <span>Liquidity</span>
                <strong>{formatBonezUsd(market.liquidity?.usd)}</strong>
              </div>
              <div className="bonez-market-stat">
                <span>Market Cap</span>
                <strong>{formatBonezUsd(market.marketCap)}</strong>
              </div>
            </div>

            <div className="bonez-market-activity">
              <div><span>24H Buys</span><strong>{formatMarketNumber(market.txns?.h24?.buys)}</strong></div>
              <div><span>24H Sells</span><strong>{formatMarketNumber(market.txns?.h24?.sells)}</strong></div>
              <div><span>Pair</span><strong>BONEZ / EGLD</strong></div>
            </div>

            <div className="bonez-market-footer">
              <div>
                <span>Last updated</span>
                <strong>
                  {marketUpdated
                    ? marketUpdated.toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "—"}
                </strong>
              </div>
              {market.url && (
                <a className="btn bonez-market-link" href={market.url} target="_blank" rel="noreferrer">
                  View Live Market ↗
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default BonezMarketSection;
