import { lazy, Suspense, useState } from "react";

import { getNftImage } from "../../utils/nftUtils";
import "./ArcadeHub.css";

const BonezRush = lazy(() => import("../bonez-rush/BonezRush"));
const PittzPalace = lazy(() => import("../pittz-palace/PittzPalace"));
const PittzMatch = lazy(() => import("../pittz-match/PittzMatch"));
const Pittz21 = lazy(() => import("../pittz-21/Pittz21"));
const PittzRoulette = lazy(() => import("../pittz-roulette/PittzRoulette"));

const GAME_LABELS = {
  rush: "BONEZ RUSH",
  palace: "PITTZ PALACE",
  match: "PITTZ MEMORY",
  twentyone: "PITTZ 21",
  roulette: "PITTZ ROULETTE",
};

function ArcadeHub({ address = "", nfts = [], nftsLoading = false, nftsError = "", onConnectWallet }) {
  const [activeGame, setActiveGame] = useState(null);
  const [equippedPittzId, setEquippedPittzId] = useState("");
  let savedPittzId = "";
  try {
    savedPittzId = address
      ? window.localStorage.getItem(`cryptopittz-equipped-pitt-${address}`) || ""
      : "";
  } catch {
    // The selector remains usable when local storage is unavailable.
  }
  const resolvedPittzId = nfts.some((nft) => nft.identifier === equippedPittzId)
    ? equippedPittzId
    : nfts.some((nft) => nft.identifier === savedPittzId)
      ? savedPittzId
      : nfts[0]?.identifier || "";
  const equippedPittz = nfts.find((nft) => nft.identifier === resolvedPittzId) || null;

  function equipPittz(identifier) {
    setEquippedPittzId(identifier);
    try {
      window.localStorage.setItem(`cryptopittz-equipped-pitt-${address}`, identifier);
    } catch {
      // The equipped Pittz remains active for this visit.
    }
  }

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

      <div className={`arcade-pack-player ${equippedPittz ? "equipped" : ""}`}>
        {equippedPittz ? (
          <>
            <img src={getNftImage(equippedPittz)} alt={equippedPittz.name || equippedPittz.identifier} />
            <div>
              <span>🐾 YOUR CABINET PITT</span>
              <strong>{equippedPittz.name || equippedPittz.identifier}</strong>
              <small>Equipped across all five games</small>
            </div>
            <label>
              <span>Switch Pittz</span>
              <select
                value={resolvedPittzId}
                onChange={(event) => equipPittz(event.target.value)}
                disabled={Boolean(activeGame)}
                title={activeGame ? "Exit the current cabinet to switch Pittz" : "Choose your cabinet Pitt"}
              >
                {nfts.map((nft) => (
                  <option value={nft.identifier} key={nft.identifier}>
                    {nft.name || nft.identifier}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <>
            <div className="arcade-pack-player-placeholder" aria-hidden="true">🐶</div>
            <div>
              <span>🐾 PLAY WITH YOUR OWN PITTZ</span>
              <strong>{nftsLoading ? "Checking your wallet..." : "Equip a CryptoPittz"}</strong>
              <small>
                {nftsError || (address ? "No CryptoPittz found in this wallet yet." : "Connect your wallet to bring your Pittz into every cabinet.")}
              </small>
            </div>
            {!address && <button type="button" onClick={onConnectWallet}>Connect Wallet</button>}
          </>
        )}
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

        <article className="arcade-cabinet roulette-cabinet">
          <div className="cabinet-bulbs" aria-hidden="true" />
          <div className="cabinet-screen">
            <span className="cabinet-status live">● LIVE</span>
            <div className="roulette-cabinet-art" aria-hidden="true">
              <div><span /><span /><span /><span /><span /><span /></div>
              <img src="/images/cryptopittz-bonez.jpg" alt="" />
            </div>
            <h3>PITTZ ROULETTE</h3>
            <p>Bet shared BONEZ on Original, Vice, odd, even, or one exact Pitt.</p>
            <div className="cabinet-tags">
              <span>12 PITTZ</span><span>SHARED BONEZ</span><span>10× EXACT</span>
            </div>
          </div>
          <div className="cabinet-controls roulette-controls-mini" aria-hidden="true">
            <i /><b /><i />
          </div>
          <button type="button" onClick={() => openGame("roulette")}>SPIN PITTZ ROULETTE</button>
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
              <BonezRush embedded equippedPittz={equippedPittz} />
            </Suspense>
          )}
          {activeGame === "palace" && (
            <Suspense fallback={<div className="arcade-loading">Lighting up Pittz Palace...</div>}>
              <PittzPalace equippedPittz={equippedPittz} walletPittz={nfts} />
            </Suspense>
          )}
          {activeGame === "match" && (
            <Suspense fallback={<div className="arcade-loading">Dealing Pittz Memory...</div>}>
              <PittzMatch equippedPittz={equippedPittz} walletPittz={nfts} />
            </Suspense>
          )}
          {activeGame === "twentyone" && (
            <Suspense fallback={<div className="arcade-loading">Shuffling the Pittz 21 deck...</div>}>
              <Pittz21 equippedPittz={equippedPittz} walletPittz={nfts} />
            </Suspense>
          )}
          {activeGame === "roulette" && (
            <Suspense fallback={<div className="arcade-loading">Rolling out the Pittz Roulette wheel...</div>}>
              <PittzRoulette equippedPittz={equippedPittz} walletPittz={nfts} />
            </Suspense>
          )}
        </div>
      )}
    </section>
  );
}

export default ArcadeHub;
