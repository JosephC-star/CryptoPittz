import { useEffect, useRef, useState } from "react";

import { EXPLORER_COLLECTIONS } from "../../config/collections";
import { getNftImage } from "../../utils/nftUtils";
import "./PittzMatch.css";

const PAIR_COUNT = 10;
const BEST_MOVES_KEY = "cryptopittz-match-best-moves-10-pairs";
const COLLECTION_TOTALS = {
  [EXPLORER_COLLECTIONS.original.collection]: 5310,
  [EXPLORER_COLLECTIONS.vice.collection]: 1395,
};

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function readBestMoves() {
  try {
    const saved = Number(window.localStorage.getItem(BEST_MOVES_KEY));
    return Number.isFinite(saved) && saved > 0 ? saved : null;
  } catch {
    return null;
  }
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

async function fetchPittzBoard() {
  const collections = Object.values(EXPLORER_COLLECTIONS);
  const responses = await Promise.all(
    collections.map(async ({ collection }) => {
      const total = COLLECTION_TOTALS[collection];
      const from = Math.floor(Math.random() * Math.max(1, total - 12));
      const response = await fetch(
        `https://api.multiversx.com/collections/${collection}/nfts?from=${from}&size=12`,
      );
      if (!response.ok) throw new Error(`Unable to load ${collection}`);
      return response.json();
    }),
  );

  const uniquePittz = Array.from(
    new Map(
      responses
        .flat()
        .map((nft) => ({
          id: nft.identifier,
          name: nft.name || nft.identifier,
          image: getNftImage(nft),
          collection: nft.collection,
        }))
        .filter((pitt) => pitt.image)
        .map((pitt) => [pitt.id, pitt]),
    ).values(),
  );

  if (uniquePittz.length < PAIR_COUNT) throw new Error("Not enough Pittz were available");

  const selected = shuffle(uniquePittz).slice(0, PAIR_COUNT);
  return shuffle(
    selected.flatMap((pitt) => [
      { ...pitt, cardId: `${pitt.id}-a` },
      { ...pitt, cardId: `${pitt.id}-b` },
    ]),
  );
}

function PittzMatch() {
  const [cards, setCards] = useState([]);
  const [openCards, setOpenCards] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [bestMoves, setBestMoves] = useState(readBestMoves);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [started, setStarted] = useState(false);
  const [boardVersion, setBoardVersion] = useState(0);
  const timers = useRef([]);

  const completed = matchedPairs.length === PAIR_COUNT;

  useEffect(() => {
    let cancelled = false;
    fetchPittzBoard()
      .then((nextCards) => {
        if (!cancelled) setCards(nextCards);
      })
      .catch((loadError) => {
        console.error("Pittz Match board loading failed:", loadError);
        if (!cancelled) {
          setError("The Pittz cards could not be loaded. Try dealing a new board.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [boardVersion]);

  useEffect(() => {
    if (!started || completed) return undefined;
    const interval = window.setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(interval);
  }, [started, completed]);

  useEffect(() => {
    return () => timers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  function flipCard(card) {
    if (
      locked ||
      completed ||
      openCards.includes(card.cardId) ||
      matchedPairs.includes(card.id)
    ) {
      return;
    }

    if (!started) setStarted(true);
    const nextOpenCards = [...openCards, card.cardId];
    setOpenCards(nextOpenCards);

    if (nextOpenCards.length < 2) return;

    const nextMoves = moves + 1;
    setMoves(nextMoves);
    setLocked(true);
    const [firstId, secondId] = nextOpenCards;
    const firstCard = cards.find((item) => item.cardId === firstId);
    const secondCard = cards.find((item) => item.cardId === secondId);
    const isMatch = firstCard?.id === secondCard?.id;

    const timer = window.setTimeout(() => {
      if (isMatch) {
        setMatchedPairs((current) => [...current, card.id]);
        const completesBoard = matchedPairs.length + 1 === PAIR_COUNT;
        if (completesBoard && (!bestMoves || nextMoves < bestMoves)) {
          setBestMoves(nextMoves);
          try {
            window.localStorage.setItem(BEST_MOVES_KEY, String(nextMoves));
          } catch {
            // The game still works if browser storage is unavailable.
          }
        }
      }
      setOpenCards([]);
      setLocked(false);
    }, isMatch ? 500 : 850);
    timers.current.push(timer);
  }

  function dealNewBoard() {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
    setLoading(true);
    setError("");
    setCards([]);
    setOpenCards([]);
    setMatchedPairs([]);
    setMoves(0);
    setSeconds(0);
    setLocked(false);
    setStarted(false);
    setBoardVersion((current) => current + 1);
  }

  return (
    <div className={`pittz-match ${completed ? "complete" : ""}`}>
      {completed && (
        <div className="match-confetti" aria-hidden="true">
          {Array.from({ length: 26 }, (_, index) => <i key={index} style={{ "--piece": index }} />)}
        </div>
      )}

      <header className="match-header">
        <div>
          <span>⚡ NEON MEMORY GRID</span>
          <h3>PITTZ MATCH</h3>
          <p>Find all ten matching CryptoPittz pairs.</p>
        </div>
        <button type="button" onClick={dealNewBoard} disabled={loading}>🔀 NEW PITTZ</button>
      </header>

      <div className="match-dashboard" aria-label="Game statistics">
        <div><span>Moves</span><strong>{moves}</strong></div>
        <div><span>Time</span><strong>{formatTime(seconds)}</strong></div>
        <div><span>Pairs</span><strong>{matchedPairs.length}/{PAIR_COUNT}</strong></div>
        <div><span>Best</span><strong>{bestMoves ? `${bestMoves} moves` : "—"}</strong></div>
      </div>

      {loading && <div className="match-message">Dealing fresh Pittz...</div>}
      {error && (
        <div className="match-message error">
          <span>{error}</span>
          <button type="button" onClick={dealNewBoard}>Try Again</button>
        </div>
      )}

      {!loading && !error && (
        <div className="match-board">
          {cards.map((card) => {
            const flipped = openCards.includes(card.cardId) || matchedPairs.includes(card.id);
            const matched = matchedPairs.includes(card.id);
            return (
              <button
                className={`match-card ${flipped ? "flipped" : ""} ${matched ? "matched" : ""}`}
                type="button"
                onClick={() => flipCard(card)}
                aria-label={flipped ? card.name : "Hidden CryptoPittz card"}
                aria-pressed={flipped}
                disabled={matched}
                key={card.cardId}
              >
                <span className="match-card-inner">
                  <span className="match-card-back" aria-hidden="true">
                    <b>🦴</b><small>PITTZ</small>
                  </span>
                  <span className="match-card-front">
                    <img
                      src={card.image}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = "/images/cryptopittz-bonez.jpg";
                      }}
                    />
                    <small>{card.name}</small>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {completed && (
        <div className="match-victory" role="status">
          <span>🏆 WOOF WOOF—BOARD CLEARED!</span>
          <strong>{moves} moves · {formatTime(seconds)}</strong>
          <button type="button" onClick={dealNewBoard}>PLAY AGAIN</button>
        </div>
      )}
    </div>
  );
}

export default PittzMatch;
