import { lazy, Suspense, useState } from "react";

import "./ArcadeHub.css";

const BonezRush = lazy(() => import("../bonez-rush/BonezRush"));
const PittzPalace = lazy(() => import("../pittz-palace/PittzPalace"));
const PittzMatch = lazy(() => import("../pittz-match/PittzMatch"));

const GAME_LABELS = {
  rush: "BONEZ RUSH",
  palace: "PITTZ PALACE",
  match: "PITTZ MATCH",
};

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
        <p>Chase high scores, stack arcade BONEZ, and make questionable neon decisions.</p>
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
            <p>Spin CryptoPittz reels and build a glorious stack of arcade BONEZ.</p>
            <div className="cabinet-tags">
              <span>3 REELS</span><span>ARCADE BONEZ</span><span>JACKPOTS</span>
            </div>
          </div>
          <div className="cabinet-controls palace-controls" aria-hidden="true">
            <i /><b /><i />
          </div>
          <button type="button" onClick={() => openGame("palace")}>ENTER PITTZ PALACE</button>
        </article>

        <article className="arcade-cabinet match-cabinet">
          <div className="cabinet-bulbs" aria-hidden="true" />
          <div className="cabinet-screen">
            <span className="cabinet-status live">● LIVE</span>
            <div className="match-mini-grid" aria-hidden="true">
              <span>?</span><span>🐶</span><span>?</span><span>🐶</span>
            </div>
            <h3>PITTZ MATCH</h3>
            <p>Flip neon cards and reunite six matching CryptoPittz pairs.</p>
            <div className="cabinet-tags">
              <span>12 CARDS</span><span>REAL PITTZ</span><span>BEST MOVES</span>
            </div>
          </div>
          <div className="cabinet-controls match-controls" aria-hidden="true">
            <i /><b /><i />
          </div>
          <button type="button" onClick={() => openGame("match")}>PLAY PITTZ MATCH</button>
        </article>
      </div>

      {activeGame && (
        <div className={`arcade-stage ${activeGame}-stage`}>
          <div className="arcade-stage-header">
            <div>
              <span>NOW PLAYING</span>
              <strong>{GAME_LABELS[activeGame]}</strong>
            </div>
            <button type="button" onClick={() => setActiveGame(null)}>✕ Exit Cabinet</button>
          </div>

          {activeGame === "rush" && (
            <Suspense fallback={<div className="arcade-loading">Powering up BONEZ Rush...</div>}>
              <BonezRush embedded />
            </Suspense>
          )}
          {activeGame === "palace" && (
            <Suspense fallback={<div className="arcade-loading">Lighting up Pittz Palace...</div>}>
              <PittzPalace />
            </Suspense>
          )}
          {activeGame === "match" && (
            <Suspense fallback={<div className="arcade-loading">Dealing Pittz Match...</div>}>
              <PittzMatch />
            </Suspense>
          )}
        </div>
      )}
    </section>
  );
}

export default ArcadeHub;
