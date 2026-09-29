import { useEffect, useRef, useState } from "react";

import { EXPLORER_COLLECTIONS } from "../../config/collections";
import { getNftImage } from "../../utils/nftUtils";
import {
  MINIMUM_STAKE,
  PACK_REFILL_POINTS,
  PALACE_STAKES,
  PITTZ_POINTS_KEY,
  STARTING_PITTZ_POINTS,
} from "../pittz-palace/palaceConfig";
import "./PittzRoulette.css";

const WHEEL_POCKETS = 12;
const COLLECTION_MULTIPLIER = 1.75;
const PARITY_MULTIPLIER = 1.75;
const EXACT_MULTIPLIER = 10;
const COLLECTION_TOTALS = { original: 5310, vice: 1395 };

function readBonez() {
  try {
    const saved = Number(window.localStorage.getItem(PITTZ_POINTS_KEY));
    return Number.isFinite(saved) && saved >= 0 ? saved : STARTING_PITTZ_POINTS;
  } catch {
    return STARTING_PITTZ_POINTS;
  }
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

async function fetchCollectionPittz(key) {
  const collection = EXPLORER_COLLECTIONS[key].collection;
  const total = COLLECTION_TOTALS[key];
  const from = Math.floor(Math.random() * Math.max(1, total - 18));
  const response = await fetch(
    `https://api.multiversx.com/collections/${collection}/nfts?from=${from}&size=18`,
  );
  if (!response.ok) throw new Error(`Unable to load ${key} Pittz`);
  const data = await response.json();
  return shuffle(
    data
      .map((nft) => ({
        id: nft.identifier,
        name: nft.name || nft.identifier,
        image: getNftImage(nft),
        collection: key,
      }))
      .filter((nft) => nft.image),
  ).slice(0, WHEEL_POCKETS / 2);
}

async function buildWheel() {
  const [originals, vice] = await Promise.all([
    fetchCollectionPittz("original"),
    fetchCollectionPittz("vice"),
  ]);
  if (originals.length < 6 || vice.length < 6) {
    throw new Error("Not enough Pittz were available to build the wheel");
  }
  return originals.flatMap((pitt, index) => [pitt, vice[index]]);
}

function betLabel(bet, wheel) {
  if (bet.kind === "collection") return bet.value === "original" ? "Original Pittz" : "Vice Pittz";
  if (bet.kind === "parity") return bet.value === "odd" ? "Odd Pocket" : "Even Pocket";
  return wheel.find((pitt) => pitt.id === bet.value)?.name || "Exact Pittz";
}

function evaluateBet(bet, winner, pocketNumber, stake) {
  let multiplier = 0;
  if (bet.kind === "collection" && winner.collection === bet.value) multiplier = COLLECTION_MULTIPLIER;
  if (bet.kind === "parity" && (pocketNumber % 2 === 0 ? "even" : "odd") === bet.value) multiplier = PARITY_MULTIPLIER;
  if (bet.kind === "exact" && winner.id === bet.value) multiplier = EXACT_MULTIPLIER;
  return { multiplier, payout: Math.round(stake * multiplier) };
}

function PittzRoulette() {
  const [wheel, setWheel] = useState([]);
  const [bonez, setBonez] = useState(readBonez);
  const [stake, setStake] = useState(25);
  const [bet, setBet] = useState({ kind: "collection", value: "original" });
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wheelVersion, setWheelVersion] = useState(0);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ spins: 0, wins: 0, biggestPayout: 0, net: 0 });
  const timerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    buildWheel()
      .then((pittz) => {
        if (!cancelled) {
          setWheel(pittz);
          setResult(null);
        }
      })
      .catch((loadError) => {
        console.error("Pittz Roulette wheel loading failed:", loadError);
        if (!cancelled) setError("The Pittz wheel could not be loaded. Try another wheel.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [wheelVersion]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PITTZ_POINTS_KEY, String(bonez));
    } catch {
      // Roulette remains playable if browser storage is unavailable.
    }
  }, [bonez]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  function selectBet(kind, value) {
    if (!spinning) setBet({ kind, value });
  }

  function spin() {
    if (spinning || loading || error || wheel.length !== WHEEL_POCKETS || bonez < stake) return;
    const winnerIndex = Math.floor(Math.random() * wheel.length);
    const winner = wheel[winnerIndex];
    const pocketNumber = winnerIndex + 1;
    const outcome = evaluateBet(bet, winner, pocketNumber, stake);
    const currentAngle = ((rotation % 360) + 360) % 360;
    const targetAngle = (360 - winnerIndex * (360 / WHEEL_POCKETS)) % 360;
    const correction = (targetAngle - currentAngle + 360) % 360;
    const nextRotation = rotation + 360 * (6 + Math.floor(Math.random() * 3)) + correction;

    setBonez((current) => current - stake);
    setResult(null);
    setSpinning(true);
    setRotation(nextRotation);

    timerRef.current = window.setTimeout(() => {
      const net = outcome.payout - stake;
      if (outcome.payout) setBonez((current) => current + outcome.payout);
      setResult({
        ...outcome,
        winner,
        pocketNumber,
        title: outcome.payout ? "WOOF WOOF — WINNER!" : "THE WHEEL KEPT THE BONEZ",
        message: outcome.payout
          ? `${betLabel(bet, wheel)} landed for ${outcome.payout} BONEZ.`
          : `${winner.name} landed in pocket ${pocketNumber}.`,
      });
      setHistory((current) => [
        { id: `${Date.now()}-${Math.random()}`, name: winner.name, pocketNumber, net },
        ...current,
      ].slice(0, 5));
      setStats((current) => ({
        spins: current.spins + 1,
        wins: current.wins + (outcome.payout ? 1 : 0),
        biggestPayout: Math.max(current.biggestPayout, outcome.payout),
        net: current.net + net,
      }));
      setSpinning(false);
      navigator.vibrate?.(outcome.payout ? [70, 40, 100] : 45);
    }, 4600);
  }

  function loadNewWheel() {
    if (spinning) return;
    setLoading(true);
    setError("");
    setWheelVersion((current) => current + 1);
  }

  function refill() {
    setBonez(PACK_REFILL_POINTS);
    setResult({
      payout: PACK_REFILL_POINTS,
      title: "PACK REFILL!",
      message: `${PACK_REFILL_POINTS} free game BONEZ are back on the table.`,
    });
  }

  return (
    <div className={`pittz-roulette ${spinning ? "is-spinning" : ""} ${result?.payout ? "roulette-win" : ""}`}>
      <header className="roulette-header">
        <div><span>THE PITTZSTOP WHEEL</span><h3>PITTZ ROULETTE</h3></div>
        <button type="button" onClick={loadNewWheel} disabled={spinning || loading}>🔀 NEW PITTZ WHEEL</button>
      </header>

      <div className="roulette-dashboard">
        <div><span>BONEZ</span><strong>{bonez.toLocaleString()}</strong></div>
        <div><span>WAGER</span><strong>{stake} BONEZ</strong></div>
        <div><span>BET</span><strong>{betLabel(bet, wheel)}</strong></div>
        <div><span>BIGGEST WIN</span><strong>{stats.biggestPayout}</strong></div>
      </div>

      {loading && <div className="roulette-loading">Rolling twelve fresh CryptoPittz onto the wheel...</div>}
      {error && <div className="roulette-loading error"><span>{error}</span><button type="button" onClick={loadNewWheel}>Try Again</button></div>}

      {!loading && !error && (
        <>
          <div className="roulette-table">
            <div className="roulette-wheel-stage">
              <div className="roulette-pointer" aria-hidden="true">▼</div>
              <div
                className="roulette-wheel"
                style={{ transform: `rotate(${rotation}deg)` }}
                aria-label="Twelve-pocket Pittz Roulette wheel"
              >
                {wheel.map((pitt, index) => (
                  <div
                    className={`roulette-pocket ${pitt.collection}`}
                    style={{ "--pocket-angle": `${index * (360 / WHEEL_POCKETS)}deg` }}
                    title={`${index + 1}. ${pitt.name}`}
                    key={pitt.id}
                  >
                    <img src={pitt.image} alt="" />
                    <b>{index + 1}</b>
                  </div>
                ))}
                <div className="roulette-hub"><img src="/images/cryptopittz-bonez.jpg" alt="" /></div>
              </div>
            </div>

            <div className="roulette-betting">
              <span className="roulette-eyebrow">PLACE YOUR BET</span>
              <div className="roulette-bet-groups">
                <button className={bet.kind === "collection" && bet.value === "original" ? "active cyan" : ""} type="button" onClick={() => selectBet("collection", "original")} disabled={spinning}>ORIGINAL <small>1.75×</small></button>
                <button className={bet.kind === "collection" && bet.value === "vice" ? "active pink" : ""} type="button" onClick={() => selectBet("collection", "vice")} disabled={spinning}>VICE <small>1.75×</small></button>
                <button className={bet.kind === "parity" && bet.value === "odd" ? "active" : ""} type="button" onClick={() => selectBet("parity", "odd")} disabled={spinning}>ODD <small>1.75×</small></button>
                <button className={bet.kind === "parity" && bet.value === "even" ? "active" : ""} type="button" onClick={() => selectBet("parity", "even")} disabled={spinning}>EVEN <small>1.75×</small></button>
              </div>

              <div className="roulette-exact-heading"><span>OR PICK THE EXACT PITT</span><strong>10×</strong></div>
              <div className="roulette-exact-grid">
                {wheel.map((pitt, index) => (
                  <button className={bet.kind === "exact" && bet.value === pitt.id ? "active" : ""} type="button" onClick={() => selectBet("exact", pitt.id)} disabled={spinning} title={pitt.name} key={pitt.id}>
                    <img src={pitt.image} alt="" /><span>{index + 1}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={`roulette-result ${result ? "show" : ""}`} aria-live="polite">
            {result?.winner && <img src={result.winner.image} alt={result.winner.name} />}
            <div><strong>{result?.title || "CHOOSE A BET AND SPIN"}</strong><span>{result?.message || "Original, Vice, odd, even, or one exact Pitt—the wheel decides."}</span></div>
            {result?.payout > 0 && result.title !== "PACK REFILL!" && <b>+{result.payout} BONEZ</b>}
          </div>

          <div className="roulette-controls">
            <div className="roulette-stakes">
              {PALACE_STAKES.map((amount) => <button className={stake === amount ? "active" : ""} type="button" onClick={() => setStake(amount)} disabled={spinning} key={amount}>{amount}</button>)}
            </div>
            <button className="roulette-spin" type="button" onClick={spin} disabled={spinning || bonez < stake}>{spinning ? "WHEEL SPINNING..." : bonez < stake ? "NEED MORE BONEZ" : `SPIN FOR ${stake} BONEZ`}</button>
            {bonez < MINIMUM_STAKE && !spinning && <button className="roulette-refill" type="button" onClick={refill}>🐾 PACK REFILL +{PACK_REFILL_POINTS}</button>}
          </div>

          <div className="roulette-stats"><span>Spins <b>{stats.spins}</b></span><span>Wins <b>{stats.wins}</b></span><span>Session net <b>{stats.net >= 0 ? "+" : ""}{stats.net}</b></span></div>

          {history.length > 0 && <div className="roulette-history">{history.map((item) => <span className={item.net >= 0 ? "win" : "loss"} key={item.id}><b>#{item.pocketNumber}</b> {item.name}<strong>{item.net >= 0 ? "+" : ""}{item.net}</strong></span>)}</div>}
        </>
      )}

      <details className="roulette-rules"><summary>🎡 Pittz Roulette Odds &amp; Rules</summary><p>Every wheel contains six Original and six Vice Pittz. Collection and odd/even bets pay 1.75×. Picking the exact winning Pitt pays 10×. All twelve pockets have an equal chance, and a New Pittz Wheel changes the artwork—not the odds.</p></details>
      <p className="roulette-disclaimer"><strong>Game BONEZ disclaimer:</strong> these free in-game points are not $BONEZ, cryptocurrency, or anything of cash/token value. No purchase required.</p>
    </div>
  );
}

export default PittzRoulette;
