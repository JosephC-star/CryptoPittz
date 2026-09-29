import { useEffect, useRef, useState } from "react";

import { EXPLORER_COLLECTIONS } from "../../config/collections";
import { getNftImage, getPittzStats } from "../../utils/nftUtils";
import {
  DOG_CATCHER,
  MINIMUM_STAKE,
  MUZZLE,
  PACK_REFILL_POINTS,
  PALACE_BATCHES_PER_COLLECTION,
  PALACE_BATCH_SIZE,
  PALACE_COLLECTION_POOLS,
  PACK_METER_GOAL,
  PALACE_STAKES,
  PITTZ_POINTS_KEY,
  STARTING_PITTZ_POINTS,
  createSpinOutcome,
  evaluateSpin,
  pickRandom,
} from "./palaceConfig";
import "./PittzPalace.css";

function readPittzPoints() {
  try {
    const saved = Number(window.localStorage.getItem(PITTZ_POINTS_KEY));
    return Number.isFinite(saved) && saved >= 0 ? saved : STARTING_PITTZ_POINTS;
  } catch {
    return STARTING_PITTZ_POINTS;
  }
}

function createSessionStats() {
  return { spins: 0, won: 0, lost: 0, biggestPayout: 0, dogCatchers: 0, muzzles: 0 };
}

function shuffleRewards(rewards) {
  return [...rewards].sort(() => Math.random() - 0.5);
}

function toSymbol(nft) {
  const stats = getPittzStats(nft.attributes);
  return {
    id: nft.identifier,
    name: nft.name || nft.identifier,
    image: getNftImage(nft),
    collection: nft.collection,
    bloodline: stats.bloodline,
    type: stats.type,
    isWild: false,
  };
}

const WILD_BONEZ = {
  id: "golden-bonez-wild",
  name: "Golden BONEZ Wild",
  image: "/images/cryptopittz-bonez.jpg",
  collection: "wild",
  bloodline: "",
  type: "",
  isWild: true,
};

function PittzPalace({ equippedPittz = null }) {
  const [symbols, setSymbols] = useState([]);
  const [reels, setReels] = useState([WILD_BONEZ, WILD_BONEZ, WILD_BONEZ]);
  const [stoppedReels, setStoppedReels] = useState([true, true, true]);
  const [points, setPoints] = useState(readPittzPoints);
  const [stake, setStake] = useState(25);
  const [spinning, setSpinning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [poolVersion, setPoolVersion] = useState(0);
  const [result, setResult] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [history, setHistory] = useState([]);
  const [sessionStats, setSessionStats] = useState(createSessionStats);
  const [packMeter, setPackMeter] = useState(0);
  const [vault, setVault] = useState(null);
  const timers = useRef([]);
  const audioContext = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const activeTimers = timers.current;

    async function loadPittz() {
      try {
        setLoadError("");
        const requests = PALACE_COLLECTION_POOLS.flatMap(({ collection, total }) =>
          Array.from({ length: PALACE_BATCHES_PER_COLLECTION }, async () => {
            const from = Math.floor(Math.random() * Math.max(1, total - PALACE_BATCH_SIZE));
            const response = await fetch(
              `https://api.multiversx.com/collections/${collection}/nfts?from=${from}&size=${PALACE_BATCH_SIZE}`,
            );
            if (!response.ok) throw new Error(`Unable to load ${collection}`);
            return response.json();
          }),
        );
        const collections = await Promise.all(requests);
        const equippedSymbol = equippedPittz ? { ...toSymbol(equippedPittz), isEquipped: true } : null;
        const sampledSymbols = collections.flat().map(toSymbol).filter((symbol) => symbol.image);
        const loadedSymbols = [
          ...(equippedSymbol?.image ? [equippedSymbol] : []),
          ...sampledSymbols.filter((symbol) => symbol.id !== equippedSymbol?.id),
          WILD_BONEZ,
          DOG_CATCHER,
          MUZZLE,
        ];

        if (!cancelled) {
          setSymbols(loadedSymbols);
          setReels(
            equippedSymbol?.image
              ? [equippedSymbol, ...loadedSymbols.filter((symbol) => symbol.id !== equippedSymbol.id).slice(0, 2)]
              : loadedSymbols.slice(0, 3),
          );
        }
      } catch (error) {
        console.error("Pittz Palace symbol loading failed:", error);
        if (!cancelled) setLoadError("The Pittz reels could not be loaded. Try the machine again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPittz();
    return () => {
      cancelled = true;
      activeTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [poolVersion, equippedPittz]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PITTZ_POINTS_KEY, String(points));
    } catch {
      // Pittz Palace remains playable when browser storage is unavailable.
    }
  }, [points]);

  function playTone(frequency, duration = 0.09) {
    if (!soundEnabled) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = audioContext.current || new AudioContext();
    audioContext.current = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gain.gain.setValueAtTime(0.045, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  function spin() {
    if (spinning || vault || symbols.length < 4 || points < stake) return;

    const packMode = packMeter >= PACK_METER_GOAL;
    const outcome = createSpinOutcome(symbols, packMode);
    const stopped = [false, false, false];
    setPoints((current) => current - stake);
    setResult(null);
    setStoppedReels(stopped);
    setSpinning(true);
    if (packMode) {
      setPackMeter(0);
      setResult({ title: "PACK MODE ACTIVATED!", message: "Charged reels guarantee a boosted result.", multiplier: 0, payout: 0, penalty: 0 });
    }
    playTone(220, 0.16);

    const ticker = window.setInterval(() => {
      setReels((current) => current.map((symbol, index) => (stopped[index] ? symbol : pickRandom(symbols))));
    }, 80);
    timers.current.push(ticker);

    [900, 1250, 1600].forEach((delay, index) => {
      const timer = window.setTimeout(() => {
        stopped[index] = true;
        setStoppedReels([...stopped]);
        setReels((current) => current.map((symbol, reelIndex) => (reelIndex === index ? outcome[index] : symbol)));
        playTone(360 + index * 150);
      }, delay);
      timers.current.push(timer);
    });

    const finishTimer = window.setTimeout(() => {
      window.clearInterval(ticker);
      const spinResult = evaluateSpin(outcome, stake, packMode);
      const netChange = spinResult.payout - stake - spinResult.penalty;
      setReels(outcome);
      if (spinResult.bonus === "vault") {
        setResult(spinResult);
        setVault({
          chosen: null,
          rewards: shuffleRewards([stake, stake * 2, stake * 5]),
          stake,
          symbols: outcome.map((symbol) => symbol.name),
          packMode,
        });
        setSpinning(false);
        playTone(880, 0.32);
        navigator.vibrate?.([60, 35, 60, 35, 110]);
        return;
      }
      setPoints((current) => Math.max(0, current + spinResult.payout - spinResult.penalty));
      setResult(spinResult);
      setSpinning(false);
      if (!packMode && netChange < 0) {
        const meterGain = outcome.some((symbol) => symbol.special === "dog-catcher") ? 2 : 1;
        setPackMeter((current) => Math.min(PACK_METER_GOAL, current + meterGain));
      }
      setHistory((current) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          title: spinResult.title,
          netChange,
          symbols: outcome.map((symbol) => symbol.name),
        },
        ...current,
      ].slice(0, 5));
      setSessionStats((current) => ({
        spins: current.spins + 1,
        won: current.won + Math.max(0, netChange),
        lost: current.lost + Math.max(0, -netChange),
        biggestPayout: Math.max(current.biggestPayout, spinResult.payout),
        dogCatchers:
          current.dogCatchers + outcome.filter((symbol) => symbol.special === "dog-catcher").length,
        muzzles: current.muzzles + outcome.filter((symbol) => symbol.special === "muzzle").length,
      }));
      if (spinResult.penalty > 0) {
        playTone(85, 0.32);
        navigator.vibrate?.([120, 50, 120]);
      } else if (spinResult.multiplier >= 3) {
        playTone(1040, 0.35);
        navigator.vibrate?.([70, 40, 100]);
      }
    }, 1750);
    timers.current.push(finishTimer);
  }

  function chooseVault(index) {
    if (!vault || vault.chosen !== null) return;
    const reward = vault.rewards[index];
    const netChange = reward - vault.stake;
    setPoints((current) => current + reward);
    setVault((current) => ({ ...current, chosen: index }));
    setResult({
      multiplier: reward / vault.stake,
      payout: reward,
      penalty: 0,
      title: reward >= vault.stake * 5 ? "VAULT JACKPOT!" : "BONEZ VAULT OPENED!",
      message: `The Pack uncovered ${reward} BONEZ.`,
    });
    setHistory((current) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        title: "BONEZ VAULT",
        netChange,
        symbols: vault.symbols,
      },
      ...current,
    ].slice(0, 5));
    setSessionStats((current) => ({
      ...current,
      spins: current.spins + 1,
      won: current.won + Math.max(0, netChange),
      lost: current.lost + Math.max(0, -netChange),
      biggestPayout: Math.max(current.biggestPayout, reward),
    }));
    playTone(reward >= vault.stake * 5 ? 1200 : 960, 0.38);
    navigator.vibrate?.([80, 40, 130]);
  }

  function refillPoints() {
    setPoints(PACK_REFILL_POINTS);
    setResult({
      multiplier: 0,
      payout: PACK_REFILL_POINTS,
      penalty: 0,
      title: "PACK REFILL!",
      message: "The pack spotted you 250 BONEZ. Get back in there!",
    });
  }

  function shufflePittz() {
    if (spinning) return;
    setLoading(true);
    setLoadError("");
    setResult(null);
    setPoolVersion((current) => current + 1);
  }

  return (
    <div className={`pittz-palace-machine ${result?.multiplier >= 3 ? "big-win" : ""}`}>
      {result?.multiplier >= 3 && (
        <div className="palace-confetti" aria-hidden="true">
          {Array.from({ length: 28 }, (_, index) => (
            <i style={{ "--confetti": index }} key={index} />
          ))}
        </div>
      )}
      <div className="palace-marquee">
        <span>♛</span><div><small>WELCOME TO</small><strong>PITTZ PALACE</strong></div><span>♛</span>
      </div>

      <div className="palace-dashboard">
        <div><span>BONEZ</span><strong>{points.toLocaleString()}</strong></div>
        <div><span>Current Spin</span><strong>{stake} BONEZ</strong></div>
        <div className="palace-dashboard-actions">
          <button type="button" onClick={shufflePittz} disabled={spinning || loading || Boolean(vault)}>
            🔀 NEW PITTZ
          </button>
          <button type="button" onClick={() => setSoundEnabled((current) => !current)}>
            {soundEnabled ? "🔊 SOUND ON" : "🔇 SOUND OFF"}
          </button>
        </div>
      </div>

      <div className={`palace-pack-meter ${packMeter >= PACK_METER_GOAL ? "ready" : ""}`}>
        <div>
          <span>🐾 PACK METER</span>
          <strong>{packMeter >= PACK_METER_GOAL ? "PACK MODE READY" : `${packMeter}/${PACK_METER_GOAL} PAWS`}</strong>
        </div>
        <div className="palace-paws" aria-label={`${packMeter} of ${PACK_METER_GOAL} Pack Meter paws filled`}>
          {Array.from({ length: PACK_METER_GOAL }, (_, index) => <i className={index < packMeter ? "filled" : ""} key={index}>🐾</i>)}
        </div>
        <small>{packMeter >= PACK_METER_GOAL ? "Your next spin is powered up." : "Losses charge a guaranteed powered-up spin."}</small>
      </div>

      <div className="palace-reel-case">
        <div className="palace-payline" aria-hidden="true" />
        {loading && <div className="palace-machine-message">Loading CryptoPittz reels...</div>}
        {loadError && <div className="palace-machine-message error">{loadError}</div>}

        {!loading && !loadError && (
          <div className="palace-reels">
            {reels.map((symbol, index) => (
              <div className={`palace-reel ${stoppedReels[index] ? "stopped" : "spinning"} ${symbol.isEquipped ? "equipped-pitt" : ""}`} key={index}>
                {symbol.image ? (
                  <img
                    src={symbol.image}
                    alt={symbol.name}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = "/images/cryptopittz-bonez.jpg";
                      event.currentTarget.classList.add("fallback-image");
                    }}
                  />
                ) : (
                  <div className={`palace-hazard-symbol ${symbol.special}`} aria-label={symbol.name}>
                    <b>{symbol.emoji}</b>
                    <em>{symbol.name}</em>
                  </div>
                )}
                <span>{symbol.isWild ? "WILD BONEZ" : symbol.isEquipped ? `YOUR PITT • ${symbol.name}` : symbol.name}</span>
                <small>
                  {symbol.isWild
                    ? "WILD"
                    : symbol.isHazard
                      ? "DANGER"
                    : symbol.collection === EXPLORER_COLLECTIONS.vice.collection
                      ? "VICE PITTZ"
                      : "ORIGINAL PITTZ"}
                </small>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`palace-result ${result ? "show" : ""}`} aria-live="polite">
        <strong>{result?.title || "CHOOSE YOUR BONEZ AND SPIN"}</strong>
        <span>{result?.message || "Three matching Pittz trigger the EXTRA MUSTY JACKPOT."}</span>
        {result?.payout > 0 && result.title !== "PACK REFILL!" && <b>+{result.payout} BONEZ</b>}
        {result?.penalty > 0 && <b className="palace-penalty">−{result.penalty} EXTRA BONEZ</b>}
      </div>

      {vault && (
        <div className="palace-vault" role="dialog" aria-label="Bonez Vault bonus round">
          <span className="vault-eyebrow">🔓 {vault.packMode ? "PACK MODE BONUS" : "SURPRISE VAULT"}</span>
          <h4>{vault.chosen === null ? "CHOOSE A BONEZ VAULT" : "VAULT REVEALED!"}</h4>
          <p>{vault.chosen === null ? "One vault returns your wager, one doubles it, and one hides a 5× jackpot." : "Collect your BONEZ and send the reels again."}</p>
          <div className="vault-doors">
            {vault.rewards.map((reward, index) => (
              <button
                className={vault.chosen === index ? "chosen" : vault.chosen !== null ? "revealed" : ""}
                type="button"
                onClick={() => chooseVault(index)}
                disabled={vault.chosen !== null}
                key={`${reward}-${index}`}
              >
                <span>{vault.chosen === null ? "?" : `${reward}`}</span>
                <small>{vault.chosen === null ? `VAULT ${index + 1}` : "BONEZ"}</small>
              </button>
            ))}
          </div>
          {vault.chosen !== null && <button className="vault-collect" type="button" onClick={() => setVault(null)}>COLLECT &amp; RETURN TO REELS</button>}
        </div>
      )}

      <div className="palace-controls-panel">
        <div className="palace-stakes" aria-label="Select BONEZ per spin">
          {PALACE_STAKES.map((amount) => (
            <button
              className={stake === amount ? "active" : ""}
              type="button"
              onClick={() => setStake(amount)}
              disabled={spinning || Boolean(vault)}
              key={amount}
            >
              {amount} BONEZ
            </button>
          ))}
        </div>

        <button className="palace-spin" type="button" onClick={spin} disabled={spinning || loading || Boolean(loadError) || Boolean(vault) || points < stake}>
          {spinning ? "SPINNING..." : vault ? "OPEN YOUR VAULT" : points < stake ? "NEED MORE BONEZ" : packMeter >= PACK_METER_GOAL ? "ACTIVATE PACK MODE" : "SPIN THE PITTZ"}
        </button>

        {points < MINIMUM_STAKE && !spinning && !vault && (
          <button className="palace-refill" type="button" onClick={refillPoints}>🐾 PACK REFILL +{PACK_REFILL_POINTS} BONEZ</button>
        )}
      </div>

      <div className="palace-paytable">
        <span>3 MATCH = 8×</span><span>2 + WILD = 5×</span><span>BLOODLINE = 3×</span><span>TYPE = 2×</span><span>PAIR = 1.5×</span><span>WILD SAVE = ½×</span><span className="danger">🚨 DOG CATCHER = −1×</span><span className="danger">🚫 MUZZLE = −½×</span>
      </div>

      <details className="palace-rules">
        <summary>📜 How to Play &amp; Complete Payout Rules</summary>
        <div>
          <p>Choose 10, 25, or 50 BONEZ, then spin. Your selected amount is removed before the reels start.</p>
          <ul>
            <li><strong>Three Wild BONEZ:</strong> 15× payout</li>
            <li><strong>Three matching Pittz:</strong> 8× payout</li>
            <li><strong>Two matching Pittz plus Wild BONEZ:</strong> 5× payout</li>
            <li><strong>Matching bloodline:</strong> 3× payout</li>
            <li><strong>Matching type:</strong> 2× payout</li>
            <li><strong>Two matching Pittz:</strong> 1.5× payout</li>
            <li><strong>Single Wild BONEZ:</strong> half-wager save</li>
            <li><strong>Dog Catcher:</strong> loses one additional full stake</li>
            <li><strong>Muzzle:</strong> loses one additional half stake</li>
          </ul>
          <p>Danger cards override every apparent match. Losing spins add one paw to the Pack Meter, while a Dog Catcher adds two. At five paws, the next spin activates Pack Mode and guarantees a boosted match or the interactive BONEZ Vault. Below 10 BONEZ, the Pack Refill restores 250 free game BONEZ.</p>
        </div>
      </details>

      <div className="palace-session">
        <h4>SESSION STATS</h4>
        <div className="palace-session-grid">
          <div><span>Spins</span><strong>{sessionStats.spins}</strong></div>
          <div><span>Net Won</span><strong>{sessionStats.won}</strong></div>
          <div><span>Net Lost</span><strong>{sessionStats.lost}</strong></div>
          <div><span>Biggest Payout</span><strong>{sessionStats.biggestPayout}</strong></div>
          <div><span>Dog Catchers</span><strong>{sessionStats.dogCatchers}</strong></div>
          <div><span>Muzzles</span><strong>{sessionStats.muzzles}</strong></div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="palace-history">
          <h4>LAST FIVE SPINS</h4>
          {history.map((spin) => (
            <div className={spin.netChange >= 0 ? "win" : "loss"} key={spin.id}>
              <span>{spin.title}</span>
              <small title={spin.symbols.join(" • ")}>{spin.symbols.join(" • ")}</small>
              <strong>{spin.netChange >= 0 ? "+" : ""}{spin.netChange} BONEZ</strong>
            </div>
          ))}
        </div>
      )}

      <div className="palace-pool-count">🎰 Current reel pool: {Math.max(0, symbols.length - 3)} CryptoPittz sampled from across both collections</div>
      <p className="palace-disclaimer"><strong>Game BONEZ disclaimer:</strong> these free in-game points are not $BONEZ, cryptocurrency, or anything of cash/token value. No purchase required.</p>
    </div>
  );
}

export default PittzPalace;
