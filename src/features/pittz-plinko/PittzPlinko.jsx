import { useEffect, useRef, useState } from "react";
import { getNftImage } from "../../utils/nftUtils";
import { PACK_REFILL_POINTS, PITTZ_POINTS_KEY, STARTING_PITTZ_POINTS } from "../pittz-palace/palaceConfig";
import { createDrop, pegPosition, RISKS, ROWS } from "./plinkoConfig";
import "./PittzPlinko.css";

function readBonez(fallback = STARTING_PITTZ_POINTS) {
  try {
    const raw = window.localStorage.getItem(PITTZ_POINTS_KEY);
    const saved = raw === null ? fallback : Number(raw);
    return Number.isFinite(saved) && saved >= 0 ? saved : fallback;
  } catch { return fallback; }
}
function saveBonez(value) {
  try { window.localStorage.setItem(PITTZ_POINTS_KEY, String(value)); }
  catch { /* The cabinet still works without browser storage. */ }
}
const PEGS = Array.from({ length: ROWS }, (_, row) =>
  Array.from({ length: row + 1 }, (_, column) => ({ ...pegPosition(row, column), id: `${row}-${column}` })),
).flat();

export default function PittzPlinko({ equippedPittz = null }) {
  const [bonez, setBonez] = useState(readBonez);
  const [stake, setStake] = useState(25);
  const [risk, setRisk] = useState("medium");
  const [chute, setChute] = useState(1);
  const [dropping, setDropping] = useState(false);
  const [ball, setBall] = useState(null);
  const [litPeg, setLitPeg] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [sound, setSound] = useState(false);
  const frame = useRef(0);
  const locked = useRef(false);
  const balance = useRef(bonez);
  const audio = useRef(null);

  useEffect(() => () => {
    cancelAnimationFrame(frame.current);
    audio.current?.close();
  }, []);

  function tone(frequency, duration = 0.055) {
    if (!sound) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      const context = audio.current || new Audio();
      audio.current = context;
      if (context.state === "suspended") void context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.055, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + duration);
    } catch { /* Audio is optional. */ }
  }

  function drop() {
    if (locked.current) return;
    const current = readBonez(balance.current);
    if (current < stake) { balance.current = current; setBonez(current); return; }
    locked.current = true;
    const outcome = createDrop(risk, stake, chute);
    const settledBalance = current - stake + outcome.payout;
    // Resolve and persist the entire round before its visual reveal. Leaving or
    // reloading a cabinet can never forfeit a pending payout or credit it twice.
    saveBonez(settledBalance);
    balance.current = settledBalance;
    setBonez(current - stake);
    setDropping(true);
    setResult(null);
    setBall(outcome.path[0]);
    tone(260, 0.12);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stepTime = reduced ? 30 : 230;
    const start = performance.now();
    let lastStep = -1;
    function animate(now) {
      const progress = (now - start) / stepTime;
      const step = Math.floor(progress);
      if (step >= outcome.path.length - 1) {
        setBall(outcome.path.at(-1));
        setLitPeg("");
        setResult(outcome);
        setHistory((previous) => [outcome, ...previous].slice(0, 8));
        setBonez(settledBalance);
        setDropping(false);
        locked.current = false;
        tone(outcome.multiplier >= 2 ? 1040 : 440, 0.2);
        return;
      }
      const from = outcome.path[step];
      const to = outcome.path[step + 1];
      const t = progress - step;
      // Each next peg is approached after a short upward deflection.
      setBall({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t - (step > 0 ? Math.sin(t * Math.PI) * 15 : 0) });
      if (step !== lastStep) {
        lastStep = step;
        setLitPeg(from.peg || "");
        if (from.peg) tone(480 + step * 38);
      }
      frame.current = requestAnimationFrame(animate);
    }
    frame.current = requestAnimationFrame(animate);
  }

  function refill() {
    if (locked.current) return;
    const current = readBonez(balance.current);
    const next = current < 10 ? current + PACK_REFILL_POINTS : current;
    saveBonez(next);
    balance.current = next;
    setBonez(next);
  }

  const payouts = RISKS[risk].payouts;
  return (
    <div className="plinko-game">
      <div className="plinko-heading">
        <div><span>DROP IT. WATCH IT. STACK IT.</span><h3>PITTZ <em>PLINKO</em></h3><p>One ball. Twelve rows. A whole lot of bounce.</p></div>
        <div className="plinko-balance"><small>SHARED BONEZ</small><strong>{bonez.toLocaleString()}</strong></div>
      </div>
      <div className="plinko-layout">
        <div className="plinko-board-wrap">
          <div className="plinko-board-top"><span>🦴 THE BONEZ DROP</span><button type="button" aria-pressed={sound} onClick={() => setSound(!sound)}>Sound {sound ? "on" : "off"}</button></div>
          <svg className="plinko-board" viewBox="-16 0 632 575" role="img" aria-label={`Twelve-row Plinko board. ${RISKS[risk].label} risk. ${dropping ? "Ball in play." : "Ready to drop."}`}>
            <defs>
              <radialGradient id="plinko-ball"><stop offset="0" stopColor="#fffbe5" /><stop offset="0.55" stopColor="#ffdc70" /><stop offset="1" stopColor="#ff8545" /></radialGradient>
              <linearGradient id="plinko-rail" x2="1" y2="1"><stop stopColor="#25e7f5" /><stop offset="1" stopColor="#e45fff" /></linearGradient>
            </defs>
            <path d="M 260 52 L -5 510 M 340 52 L 605 510" stroke="url(#plinko-rail)" strokeWidth="2" fill="none" opacity=".35" />
            {[0, 1, 2].map((index) => <g key={index} opacity={chute === index ? 1 : 0.28}><rect x={244 + index * 40} y="12" width="32" height="28" rx="9" fill="none" stroke="#48edff" /><text x={260 + index * 40} y="32" textAnchor="middle" fill="#b8faff" fontSize="18">↓</text></g>)}
            {PEGS.map((peg) => <circle key={peg.id} cx={peg.x} cy={peg.y} r={litPeg === peg.id ? 7 : 4} className={litPeg === peg.id ? "plinko-peg lit" : "plinko-peg"} />)}
            {payouts.map((multiplier, index) => <g key={index} className={`plinko-slot ${index < 2 || index > 10 ? "edge" : ""} ${result?.slot === index ? "winner" : ""}`}>
              <rect x={index * 48 - 10} y="515" width="44" height="44" rx="8" /><text x={12 + index * 48} y="542" textAnchor="middle" fontSize="14" fontWeight="800">{multiplier}×</text>
            </g>)}
            {ball && <g className="plinko-ball"><circle cx={ball.x} cy={ball.y} r="10" fill="url(#plinko-ball)" /><text x={ball.x} y={ball.y + 4} fontSize="12" textAnchor="middle">🦴</text></g>}
          </svg>
          <div className={`plinko-result ${result?.multiplier >= 2 ? "big" : ""}`} role="status" aria-live="polite">
            {dropping ? "BONEZ INCOMING…" : result ? `${result.multiplier}× • ${result.payout} BONEZ returned • ${result.payout - result.stake >= 0 ? "+" : ""}${result.payout - result.stake} net` : "Pick your risk. Send the Bonez."}
          </div>
        </div>
        <div className="plinko-panel">
          {equippedPittz && <div className="plinko-player"><img src={getNftImage(equippedPittz)} alt="" /><div><small>YOUR DROP PARTNER</small><strong>{equippedPittz.name || equippedPittz.identifier}</strong></div></div>}
          <fieldset disabled={dropping}><legend>01 / CHOOSE YOUR RISK</legend><div className="plinko-options">{Object.entries(RISKS).map(([key, config]) => <button type="button" key={key} aria-pressed={risk === key} onClick={() => { setRisk(key); setResult(null); setBall(null); }}>{config.label}</button>)}</div><p>{RISKS[risk].description}</p></fieldset>
          <fieldset disabled={dropping}><legend>02 / BET BONEZ</legend><div className="plinko-options">{[10, 25, 50, 100].map((amount) => <button key={amount} type="button" aria-pressed={stake === amount} onClick={() => setStake(amount)}>{amount}</button>)}</div></fieldset>
          <fieldset disabled={dropping}><legend>03 / LAUNCH CHUTE</legend><div className="plinko-options">{["Left", "Center", "Right"].map((name, index) => <button key={name} type="button" aria-pressed={chute === index} onClick={() => setChute(index)}>{name}</button>)}</div><p>All chutes meet the first peg and have the same odds.</p></fieldset>
          <button className="plinko-drop" type="button" onClick={drop} disabled={dropping || bonez < stake}>{dropping ? "BOUNCING…" : bonez < stake ? "NEED MORE BONEZ" : `DROP ${stake} BONEZ ↓`}</button>
          {bonez < 10 && !dropping && <button className="plinko-refill" type="button" onClick={refill}>Pack refill +{PACK_REFILL_POINTS} free Bonez</button>}
          <small className="plinko-return-note">Multipliers show the total return, including your bet. Payouts round to whole Bonez.</small>
        </div>
      </div>
      <div className="plinko-history"><span>LAST DROPS</span>{history.length ? history.map((drop, index) => <span className={drop.multiplier >= 2 ? "hot" : ""} key={index} title={`${RISKS[drop.risk].label} risk · ${drop.stake} bet · ${drop.payout} returned`}>{drop.multiplier}×</span>) : <small>Your bounce streak starts here.</small>}</div>
      <details className="plinko-rules"><summary>How the Bonez bounce</summary><p>Each of the 12 pegs sends the ball left or right with equal probability. Center slots are most common; the outermost slots each have a 1 in 4,096 chance. Risk changes payouts, not the ball’s odds. The bounce animation reveals a random result resolved when you drop, so leaving the cabinet or refreshing keeps your settled balance. Below 10 Bonez, claim a free Pack refill.</p></details>
      <p className="plinko-disclaimer">Game BONEZ are free in-game points, not $BONEZ or cryptocurrency, and have no cash or token value. No purchase required.</p>
    </div>
  );
}
