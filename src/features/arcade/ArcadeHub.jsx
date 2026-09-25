import { lazy, Suspense, useState } from "react";

import "./ArcadeHub.css";

const BonezRush = lazy(() => import("../bonez-rush/BonezRush"));
const PittzPalace = lazy(() => import("../pittz-palace/PittzPalace"));
const PittzMatch = lazy(() => import("../pittz-match/PittzMatch"));
const Pittz21 = lazy(() => import("../pittz-21/Pittz21"));

const GAME_LABELS = {
  rush: "BONEZ RUSH",
  palace: "PITTZ PALACE",
  match: "PITTZ MEMORY",
  twentyone: "PITTZ 21",
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
        <p>Chase high scores, stack BONEZ, and make questionable neon decisions.</p>
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
            <p>Spin CryptoPittz reels and build a glorious stack of BONEZ.</p>
            <div className="cabinet-tags">
              <span>3 REELS</span><span>BONEZ</span><span>JACKPOTS</span>
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
            <h3>PITTZ MEMORY</h3>
            <p>Flip neon cards and reunite ten matching CryptoPittz pairs.</p>
            <div className="cabinet-tags">
              <span>20 CARDS</span><span>REAL PITTZ</span><span>BEST MOVES</span>
            </div>
          </div>
          <div className="cabinet-controls match-controls" aria-hidden="true">
            <i /><b /><i />
          </div>
          <button type="button" onClick={() => openGame("match")}>PLAY PITTZ MEMORY</button>
        </article>

        <article className="arcade-cabinet twentyone-cabinet">
          <div className="cabinet-bulbs" aria-hidden="true" />
          <div className="cabinet-screen">
            <span className="cabinet-status live">● LIVE</span>
            <div className="twentyone-cabinet-art" aria-hidden="true">
              <span><img src="/images/cryptopittz-bonez.jpg" alt="" /></span>
              <div><b>A♠</b><b>K♥</b></div>
            </div>
            <h3>PITTZ 21</h3>
            <p>Play Pack-rules blackjack with a fresh deck of 52 random CryptoPittz.</p>
            <div className="cabinet-tags">
              <span>52 PITTZ</span><span>SHARED BONEZ</span><span>DOUBLE DOWN</span>
            </div>
          </div>
          <div className="cabinet-controls twentyone-controls" aria-hidden="true">
            <i /><b /><i />
          </div>
          <button type="button" onClick={() => openGame("twentyone")}>PLAY PITTZ 21</button>
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
            <Suspense fallback={<div className="arcade-loading">Dealing Pittz Memory...</div>}>
              <PittzMatch />
            </Suspense>
          )}
          {activeGame === "twentyone" && (
            <Suspense fallback={<div className="arcade-loading">Shuffling the Pittz 21 deck...</div>}>
              <Pittz21 />
            </Suspense>
          )}
        </div>
      )}
    </section>
  );
}

export default ArcadeHub;
