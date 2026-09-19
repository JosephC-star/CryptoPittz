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

function PittzPalace() {
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
        const loadedSymbols = [
          ...collections.flat().map(toSymbol).filter((symbol) => symbol.image),
          WILD_BONEZ,
          DOG_CATCHER,
          MUZZLE,
        ];

        if (!cancelled) {
          setSymbols(loadedSymbols);
          setReels(loadedSymbols.slice(0, 3));
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
  }, [poolVersion]);

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
    if (spinning || symbols.length < 4 || points < stake) return;

    const outcome = createSpinOutcome(symbols);
    const stopped = [false, false, false];
    setPoints((current) => current - stake);
    setResult(null);
    setStoppedReels(stopped);
    setSpinning(true);
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
      const spinResult = evaluateSpin(outcome, stake);
      setReels(outcome);
      setPoints((current) => Math.max(0, current + spinResult.payout - spinResult.penalty));
      setResult(spinResult);
      setSpinning(false);
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

  function refillPoints() {
    setPoints(PACK_REFILL_POINTS);
    setResult({
      multiplier: 0,
      payout: PACK_REFILL_POINTS,
      penalty: 0,
      title: "PACK REFILL!",
      message: "The pack spotted you 250 Pittz Points. Get back in there!",
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
      <div className="palace-marquee">
        <span>♛</span><div><small>WELCOME TO</small><strong>PITTZ PALACE</strong></div><span>♛</span>
      </div>

      <div className="palace-dashboard">
        <div><span>Pittz Points</span><strong>{points.toLocaleString()}</strong></div>
        <div><span>Current Spin</span><strong>{stake} PP</strong></div>
        <div className="palace-dashboard-actions">
          <button type="button" onClick={shufflePittz} disabled={spinning || loading}>
            🔀 NEW PITTZ
          </button>
          <button type="button" onClick={() => setSoundEnabled((current) => !current)}>
            {soundEnabled ? "🔊 SOUND ON" : "🔇 SOUND OFF"}
          </button>
        </div>
      </div>

      <div className="palace-reel-case">
        <div className="palace-payline" aria-hidden="true" />
        {loading && <div className="palace-machine-message">Loading CryptoPittz reels...</div>}
        {loadError && <div className="palace-machine-message error">{loadError}</div>}

        {!loading && !loadError && (
          <div className="palace-reels">
            {reels.map((symbol, index) => (
              <div className={`palace-reel ${stoppedReels[index] ? "stopped" : "spinning"}`} key={index}>
                {symbol.image ? (
                  <img src={symbol.image} alt={symbol.name} />
                ) : (
                  <div className={`palace-hazard-symbol ${symbol.special}`} aria-label={symbol.name}>
                    <b>{symbol.emoji}</b>
                    <em>{symbol.name}</em>
                  </div>
                )}
                <span>{symbol.isWild ? "WILD BONEZ" : symbol.name}</span>
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
        <strong>{result?.title || "CHOOSE YOUR PITTZ POINTS AND SPIN"}</strong>
        <span>{result?.message || "Three matching Pittz trigger the EXTRA MUSTY JACKPOT."}</span>
        {result?.payout > 0 && result.title !== "PACK REFILL!" && <b>+{result.payout} PITTZ POINTS</b>}
        {result?.penalty > 0 && <b className="palace-penalty">−{result.penalty} EXTRA PITTZ POINTS</b>}
      </div>

      <div className="palace-controls-panel">
        <div className="palace-stakes" aria-label="Select Pittz Points per spin">
          {PALACE_STAKES.map((amount) => (
            <button
              className={stake === amount ? "active" : ""}
              type="button"
              onClick={() => setStake(amount)}
              disabled={spinning}
              key={amount}
            >
              {amount} PP
            </button>
          ))}
        </div>

        <button className="palace-spin" type="button" onClick={spin} disabled={spinning || loading || Boolean(loadError) || points < stake}>
          {spinning ? "SPINNING..." : points < stake ? "NEED MORE PITTZ POINTS" : "SPIN THE PITTZ"}
        </button>

        {points < MINIMUM_STAKE && !spinning && (
          <button className="palace-refill" type="button" onClick={refillPoints}>🐾 PACK REFILL +{PACK_REFILL_POINTS} PP</button>
        )}
      </div>

      <div className="palace-paytable">
        <span>3 MATCH = 10×</span><span>2 + WILD = 8×</span><span>BLOODLINE = 4×</span><span>TYPE = 3×</span><span>PAIR = 2×</span><span className="danger">🚨 DOG CATCHER = −1×</span><span className="danger">🚫 MUZZLE = −½×</span>
      </div>
      <div className="palace-pool-count">🎰 Current reel pool: {Math.max(0, symbols.length - 3)} CryptoPittz sampled from across both collections</div>
      <p className="palace-disclaimer">Pittz Points are free arcade points with no cash or token value. No purchase required.</p>
    </div>
  );
}

export default PittzPalace;
