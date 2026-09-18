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

function BonezRush() {
  const [status, setStatus] = useState("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(readHighScore);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [combo, setCombo] = useState(0);
  const [items, setItems] = useState([]);
  const [feedback, setFeedback] = useState("Ready for the glorious crunch?");
  const nextItemId = useRef(1);
  const pointerStarts = useRef(new Map());

  const playing = status === "playing";
  const comboTier = getComboTier(combo);

  useEffect(() => {
    if (!playing) return undefined;

    const timer = window.setInterval(() => {
      setTimeLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [playing]);

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
  }, [lives, playing, score, timeLeft]);

  function startGame() {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setLives(STARTING_LIVES);
    setCombo(0);
    setItems([createRushItem(nextItemId.current++)]);
    setFeedback("RUSH!");
    setStatus("playing");
  }

  function removeItem(id) {
    setItems((current) => current.filter((item) => item.id !== id));
    pointerStarts.current.delete(id);
  }

  function collectItem(item, action = "CRUNCH") {
    if (!playing) return;

    removeItem(item.id);

    if (item.type === "hazard") {
      setScore((current) => Math.max(0, current + item.points));
      setLives((current) => Math.max(0, current - 1));
      setCombo(0);
      setFeedback("BAD BONE! 💥");
      return;
    }

    setCombo((current) => {
      const nextCombo = current + 1;
      const nextTier = getComboTier(nextCombo);
      const earned = item.points * nextTier.multiplier;
      setScore((currentScore) => currentScore + earned);

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
    }
  }

  function rememberPointer(item, event) {
    pointerStarts.current.set(item.id, { x: event.clientX, y: event.clientY });
  }

  function finishPointer(item, event) {
    const start = pointerStarts.current.get(item.id);
    if (!start) return;

    const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    collectItem(item, distance > 24 ? "SWIPE CRUNCH" : "CRUNCH");
  }

  const hearts = Array.from({ length: STARTING_LIVES }, (_, index) => (
    <span className={index < lives ? "active" : "lost"} key={index}>
      ♥
    </span>
  ));

  return (
    <section id="bonez-rush" className="bonez-rush-section">
      <div className="section-title bonez-rush-title">
        <span>🎮 CryptoPittz Arcade</span>
        <h2>BONEZ Rush</h2>
        <p>Tap, click or swipe the falling BONEZ. Dodge the bad bones. Chase the crunch.</p>
      </div>

      <div className={`bonez-rush ${playing ? "is-playing" : ""}`}>
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

        <div className="bonez-rush-arena" aria-live="polite">
          <div className="bonez-rush-skyline" aria-hidden="true" />
          <div className={`bonez-rush-feedback ${comboTier.className}`}>{feedback}</div>

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
              onClick={(event) => event.detail === 0 && collectItem(item)}
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
              <p>
                {status === "finished"
                  ? `You crunched ${score} points.`
                  : "You have 30 seconds and three lives. Reach WOOF WOOF at 5, then go EXTRA MUSTY at 10!"}
              </p>
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
        </div>
      </div>
    </section>
  );
}

export default BonezRush;
