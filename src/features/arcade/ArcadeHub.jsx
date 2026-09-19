import { lazy, Suspense, useState } from "react";

import "./ArcadeHub.css";

const BonezRush = lazy(() => import("../bonez-rush/BonezRush"));
const PittzPalace = lazy(() => import("../pittz-palace/PittzPalace"));

function ArcadeHub() {
  const [activeGame, setActiveGame] = useState(null);

  function openGame(game) {
    setActiveGame(game);
    window.setTimeout(() => {
      document.querySelector(".arcade-stage")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  return (
    <section id="arcade" className="arcade-hub">
      <div className="arcade-neon-sign" aria-hidden="true">
        <span>★</span>
        <strong>CRYPTOPITTZ ARCADE</strong>
        <span>★</span>
      </div>

      <div className="section-title arcade-title">
        <span>🎮 Welcome to the Pack’s Playground</span>
        <h2>Choose Your Cabinet</h2>
        <p>Chase high scores, stack Pittz Points, and make questionable neon decisions.</p>
      </div>

      <div className="arcade-lobby">
        <article className="arcade-cabinet rush-cabinet">
          <div className="cabinet-bulbs" aria-hidden="true" />
          <div className="cabinet-screen">
            <span className="cabinet-status live">● LIVE</span>
            <div className="rush-cabinet-art" aria-hidden="true">
              <span>🦴</span><span>💀</span><span>🥩</span>
            </div>
            <h3>BONEZ RUSH</h3>
            <p>Tap, swipe, and crunch your way into EXTRA MUSTY territory.</p>
            <div className="cabinet-tags">
              <span>30 SEC</span><span>COMBOS</span><span>HIGH SCORE</span>
            </div>
          </div>
          <div className="cabinet-controls" aria-hidden="true">
            <i /><b /><i />
          </div>
          <button type="button" onClick={() => openGame("rush")}>PLAY BONEZ RUSH</button>
        </article>

        <article className="arcade-cabinet palace-cabinet">
          <div className="cabinet-bulbs" aria-hidden="true" />
          <div className="cabinet-screen">
            <span className="cabinet-status preview">★ NOW OPEN</span>
            <div className="palace-mini-reels" aria-hidden="true">
              <span>🐶</span><span>🦴</span><span>🐶</span>
            </div>
            <h3>PITTZ PALACE</h3>
            <p>Spin CryptoPittz reels and build a glorious stack of Pittz Points.</p>
            <div className="cabinet-tags">
              <span>3 REELS</span><span>PITTZ POINTS</span><span>JACKPOTS</span>
            </div>
          </div>
          <div className="cabinet-controls palace-controls" aria-hidden="true">
            <i /><b /><i />
          </div>
          <button type="button" onClick={() => openGame("palace")}>ENTER PITTZ PALACE</button>
        </article>
      </div>

      {activeGame && (
        <div className={`arcade-stage ${activeGame === "palace" ? "palace-stage" : ""}`}>
          <div className="arcade-stage-header">
            <div>
              <span>NOW PLAYING</span>
              <strong>{activeGame === "rush" ? "BONEZ RUSH" : "PITTZ PALACE"}</strong>
            </div>
            <button type="button" onClick={() => setActiveGame(null)}>✕ Exit Cabinet</button>
          </div>

          {activeGame === "rush" ? (
            <Suspense fallback={<div className="arcade-loading">Powering up BONEZ Rush...</div>}>
              <BonezRush embedded />
            </Suspense>
          ) : (
            <Suspense fallback={<div className="arcade-loading">Lighting up Pittz Palace...</div>}>
              <PittzPalace />
            </Suspense>
          )}
        </div>
      )}
    </section>
  );
}

export default ArcadeHub;
