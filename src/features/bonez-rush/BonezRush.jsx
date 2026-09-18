import { useEffect, useRef, useState } from "react";

import {
  BONEZ_RUSH_HIGH_SCORE_KEY,
  GAME_DURATION,
  SPAWN_INTERVAL,
  STARTING_LIVES,
  createRushItem,
  getComboTier,
} from "./gameConfig";
import "./BonezRush.css";

function readHighScore() {
  try {
    return Number(window.localStorage.getItem(BONEZ_RUSH_HIGH_SCORE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function createRoundStats() {
  return { collected: 0, golden: 0, hazards: 0, missed: 0, bestCombo: 0 };
}

function getPerformanceRank(score) {
  if (score >= 3000) return "CERTIFIED EXTRA MUSTY";
  if (score >= 1800) return "WOOF WOOF CHAMPION";
  if (score >= 900) return "PACK LEADER";
  if (score >= 400) return "BONE HUNTER";
  return "YARD PUP";
}

function BonezRush() {
  const [status, setStatus] = useState("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(readHighScore);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [combo, setCombo] = useState(0);
  const [items, setItems] = useState([]);
  const [effects, setEffects] = useState([]);
  const [feedback, setFeedback] = useState("Ready for the glorious crunch?");
  const [roundStats, setRoundStats] = useState(createRoundStats);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [arenaEffect, setArenaEffect] = useState("");
  const [newRecord, setNewRecord] = useState(false);
  const nextItemId = useRef(1);
  const nextEffectId = useRef(1);
  const pointerStarts = useRef(new Map());
  const arenaRef = useRef(null);
  const audioContextRef = useRef(null);
  const effectTimers = useRef([]);

  const playing = status === "playing";
  const comboTier = getComboTier(combo);
  const finalFrenzy = playing && timeLeft <= 5;
  const comboProgress = combo >= 10 ? 100 : combo >= 5 ? ((combo - 5) / 5) * 100 : (combo / 5) * 100;
  const nextComboLabel = combo >= 10 ? "MAXIMUM MUSTY" : combo >= 5 ? "EXTRA MUSTY AT 10" : "WOOF WOOF AT 5";

  useEffect(() => {
    const timers = effectTimers.current;
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    if (!playing) return undefined;

    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        const nextTime = Math.max(0, current - 1);
        if (nextTime === 5) setFeedback("⚡ FINAL FIVE FRENZY! ⚡");
        return nextTime;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    if (!finalFrenzy) return undefined;

    const frenzySpawner = window.setInterval(() => {
      setItems((current) => [...current, createRushItem(nextItemId.current++)]);
    }, 310);

    return () => window.clearInterval(frenzySpawner);
  }, [finalFrenzy]);

  useEffect(() => {
    if (!playing) return undefined;

    const spawner = window.setInterval(() => {
      setItems((current) => [...current, createRushItem(nextItemId.current++)]);
    }, SPAWN_INTERVAL);

    return () => window.clearInterval(spawner);
  }, [playing]);

  useEffect(() => {
    if (!playing || (timeLeft > 0 && lives > 0)) return undefined;

    const finishGame = window.setTimeout(() => {
      setStatus("finished");
      setItems([]);
      setCombo(0);
      setNewRecord(score > highScore);
      setHighScore((current) => {
        const nextHighScore = Math.max(current, score);

        try {
          window.localStorage.setItem(BONEZ_RUSH_HIGH_SCORE_KEY, String(nextHighScore));
        } catch {
          // The game still works when browser storage is unavailable.
        }

        return nextHighScore;
      });
    }, 0);

    return () => window.clearTimeout(finishGame);
  }, [highScore, lives, playing, score, timeLeft]);

  function playSound(type) {
    if (!soundEnabled) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const context = audioContextRef.current || new AudioContext();
    audioContextRef.current = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const frequencies = { bone: 520, golden: 880, steak: 660, hazard: 110, combo: 1040 };

    oscillator.type = type === "hazard" ? "sawtooth" : "square";
    oscillator.frequency.setValueAtTime(frequencies[type] || 520, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      type === "hazard" ? 55 : (frequencies[type] || 520) * 1.45,
      context.currentTime + 0.12,
    );
    gain.gain.setValueAtTime(0.055, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.16);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.17);
  }

  function triggerArenaEffect(type) {
    setArenaEffect(type);
    const timer = window.setTimeout(() => setArenaEffect(""), 280);
    effectTimers.current.push(timer);
  }

  function addBurst(item, event, text) {
    const bounds = arenaRef.current?.getBoundingClientRect();
    const effect = {
      id: nextEffectId.current++,
      type: item.type,
      text,
      x: bounds && event ? event.clientX - bounds.left : `${item.x}%`,
      y: bounds && event ? event.clientY - bounds.top : "45%",
    };

    setEffects((current) => [...current, effect]);
    const timer = window.setTimeout(() => {
      setEffects((current) => current.filter((currentEffect) => currentEffect.id !== effect.id));
    }, 720);
    effectTimers.current.push(timer);
  }

  function startGame() {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setLives(STARTING_LIVES);
    setCombo(0);
    setItems([createRushItem(nextItemId.current++)]);
    setEffects([]);
    setRoundStats(createRoundStats());
    setNewRecord(false);
    setArenaEffect("");
    setFeedback("RUSH!");
    setStatus("playing");
  }

  function removeItem(id) {
    setItems((current) => current.filter((item) => item.id !== id));
    pointerStarts.current.delete(id);
  }

  function collectItem(item, action = "CRUNCH", event) {
    if (!playing) return;

    removeItem(item.id);

    if (item.type === "hazard") {
      setScore((current) => Math.max(0, current + item.points));
      setLives((current) => Math.max(0, current - 1));
      setCombo(0);
      setFeedback("BAD BONE! 💥");
      setRoundStats((current) => ({ ...current, hazards: current.hazards + 1 }));
      addBurst(item, event, "−15");
      triggerArenaEffect("hazard-hit");
      playSound("hazard");
      navigator.vibrate?.(90);
      return;
    }

    setCombo((current) => {
      const nextCombo = current + 1;
      const nextTier = getComboTier(nextCombo);
      const earned = item.points * nextTier.multiplier;
      setScore((currentScore) => currentScore + earned);
      setRoundStats((currentStats) => ({
        ...currentStats,
        collected: currentStats.collected + 1,
        golden: currentStats.golden + (item.type === "golden" ? 1 : 0),
        bestCombo: Math.max(currentStats.bestCombo, nextCombo),
      }));
      addBurst(item, event, `+${earned}`);
      playSound(nextCombo === 5 || nextCombo === 10 ? "combo" : item.type);

      if (item.type === "golden") triggerArenaEffect("golden-hit");

      if (nextCombo === 5 || nextCombo === 10) {
        setFeedback(`${nextTier.name} ${nextTier.multiplier}× • +${earned}`);
      } else {
        setFeedback(
          nextTier.multiplier > 1
            ? `${nextTier.name} ${action}! +${earned}`
            : `${action}! +${earned}`,
        );
      }

      return nextCombo;
    });
  }

  function missItem(item) {
    removeItem(item.id);

    if (playing && item.type !== "hazard") {
      setLives((current) => Math.max(0, current - 1));
      setCombo(0);
      setFeedback("BONEZ MISSED!");
      setRoundStats((current) => ({ ...current, missed: current.missed + 1 }));
    }
  }

  function rememberPointer(item, event) {
    pointerStarts.current.set(item.id, { x: event.clientX, y: event.clientY });
  }

  function finishPointer(item, event) {
    const start = pointerStarts.current.get(item.id);
    if (!start) return;

    const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    collectItem(item, distance > 24 ? "SWIPE CRUNCH" : "CRUNCH", event);
  }

  const hearts = Array.from({ length: STARTING_LIVES }, (_, index) => (
    <span className={index < lives ? "active" : "lost"} key={index}>
      ♥
    </span>
  ));
  const totalAttempts = roundStats.collected + roundStats.hazards + roundStats.missed;
  const accuracy = totalAttempts ? Math.round((roundStats.collected / totalAttempts) * 100) : 0;
  const performanceRank = getPerformanceRank(score);

  return (
    <section id="bonez-rush" className="bonez-rush-section">
      <div className="section-title bonez-rush-title">
        <span>🎮 CryptoPittz Arcade</span>
        <h2>BONEZ Rush</h2>
        <p>Tap, click or swipe the falling BONEZ. Dodge the bad bones. Chase the crunch.</p>
      </div>

      <div
        className={`bonez-rush ${playing ? "is-playing" : ""} ${comboTier.className} ${
          finalFrenzy ? "final-frenzy" : ""
        }`}
      >
        <div className="bonez-rush-scoreboard" aria-label="Game scoreboard">
          <div><span>Score</span><strong>{score}</strong></div>
          <div><span>Best</span><strong>{highScore}</strong></div>
          <div><span>Time</span><strong>{timeLeft}s</strong></div>
          <div className={`bonez-rush-combo ${comboTier.className}`}>
            <span>Combo • {combo} streak</span>
            <strong>{comboTier.name} {comboTier.multiplier}×</strong>
          </div>
          <div className="bonez-rush-lives"><span>Lives</span><strong>{hearts}</strong></div>
        </div>

        <div className="bonez-rush-combo-meter" aria-label={`${combo} catch combo`}>
          <span>{nextComboLabel}</span>
          <div><i style={{ width: `${comboProgress}%` }} /></div>
        </div>

        <div
          className={`bonez-rush-arena ${arenaEffect}`}
          aria-live="polite"
          ref={arenaRef}
        >
          <div className="bonez-rush-skyline" aria-hidden="true" />
          <div className="bonez-rush-lasers" aria-hidden="true" />
          <div className={`bonez-rush-feedback ${comboTier.className}`}>{feedback}</div>

          {finalFrenzy && <div className="bonez-rush-frenzy-sign">FINAL FIVE!</div>}

          {effects.map((effect) => (
            <div
              className={`bonez-rush-burst ${effect.type}`}
              style={{ left: effect.x, top: effect.y }}
              aria-hidden="true"
              key={effect.id}
            >
              <strong>{effect.text}</strong>
              {Array.from({ length: 8 }, (_, index) => (
                <i style={{ "--spark": index }} key={index} />
              ))}
            </div>
          ))}

          {items.map((item) => (
            <button
              type="button"
              className={`rush-item rush-item-${item.type}`}
              style={{
                "--rush-x": `${item.x}%`,
                "--rush-drift": `${item.drift}px`,
                "--rush-rotation": `${item.rotation}deg`,
                "--rush-duration": `${item.duration}s`,
              }}
              aria-label={`${item.label}, ${item.points > 0 ? "+" : ""}${item.points} points`}
              onPointerDown={(event) => rememberPointer(item, event)}
              onPointerUp={(event) => finishPointer(item, event)}
              onPointerCancel={() => pointerStarts.current.delete(item.id)}
              onClick={(event) => event.detail === 0 && collectItem(item, "CRUNCH", event)}
              onAnimationEnd={() => missItem(item)}
              key={item.id}
            >
              <span aria-hidden="true">{item.symbol}</span>
            </button>
          ))}

          {!playing && (
            <div className="bonez-rush-overlay">
              <span className="bonez-rush-logo">🦴</span>
              <h3>{status === "finished" ? "RUSH COMPLETE!" : "THE HUNT IS ON"}</h3>
              {status === "finished" ? (
                <>
                  <div className="bonez-rush-rank">{newRecord ? "🏆 NEW HIGH SCORE • " : ""}{performanceRank}</div>
                  <div className="bonez-rush-results">
                    <div><span>Score</span><strong>{score}</strong></div>
                    <div><span>Collected</span><strong>{roundStats.collected}</strong></div>
                    <div><span>Best Combo</span><strong>{roundStats.bestCombo}×</strong></div>
                    <div><span>Accuracy</span><strong>{accuracy}%</strong></div>
                  </div>
                </>
              ) : (
                <p>
                  You have 30 seconds and three lives. Reach WOOF WOOF at 5, then go EXTRA MUSTY at 10!
                </p>
              )}
              <button className="btn primary bonez-rush-start" type="button" onClick={startGame}>
                {status === "finished" ? "Run It Back" : "Start BONEZ Rush"}
              </button>
            </div>
          )}
        </div>

        <div className="bonez-rush-legend" aria-label="Game item values">
          <span>🦴 +10</span>
          <span className="golden">🦴 +30</span>
          <span>🥩 +20</span>
          <span>💀 −15 &amp; one life</span>
          <button
            className={`bonez-rush-sound ${soundEnabled ? "active" : ""}`}
            type="button"
            onClick={() => setSoundEnabled((current) => !current)}
            aria-pressed={soundEnabled}
          >
            {soundEnabled ? "🔊 Arcade Sound On" : "🔇 Arcade Sound Off"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default BonezRush;
