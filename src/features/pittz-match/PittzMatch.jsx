import { useEffect, useRef, useState } from "react";

import { EXPLORER_COLLECTIONS } from "../../config/collections";
import { getNftImage } from "../../utils/nftUtils";
import "./PittzMatch.css";

const BOARD_OPTIONS = [
  { id: "pup", label: "Pup", pairs: 6, columns: 4, mobileColumns: 3 },
  { id: "street", label: "Street", pairs: 8, columns: 4, mobileColumns: 4 },
  { id: "pack", label: "Pack", pairs: 10, columns: 5, mobileColumns: 4 },
  { id: "alpha", label: "Alpha", pairs: 12, columns: 6, mobileColumns: 4 },
  { id: "legend", label: "Legend", pairs: 15, columns: 6, mobileColumns: 5 },
];
const DEFAULT_BOARD = BOARD_OPTIONS[2];
// Keep the existing 10-pair storage key compatible with players' saved records.
const BEST_MOVES_KEY = "cryptopittz-match-best-moves";
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

function readBestMoves(pairCount) {
  try {
    const saved = Number(window.localStorage.getItem(`${BEST_MOVES_KEY}-${pairCount}-pairs`));
    return Number.isFinite(saved) && saved > 0 ? saved : null;
  } catch {
    return null;
  }
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function toMemoryPitt(nft, ownedIds, equippedPittz) {
  return {
    id: nft.identifier,
    name: nft.name || nft.identifier,
    image: getNftImage(nft),
    collection: nft.collection,
    isOwned: ownedIds.has(nft.identifier),
    isEquipped: nft.identifier === equippedPittz?.identifier,
  };
}

async function fetchPittzBoard(walletPittz, equippedPittz, pairCount) {
  const ownedIds = new Set(walletPittz.map((nft) => nft.identifier));
  const ownedCards = shuffle(walletPittz.map((nft) => toMemoryPitt(nft, ownedIds, equippedPittz)))
    .filter((pitt) => pitt.image);
  const equippedCard = ownedCards.find((pitt) => pitt.isEquipped);
  let selected = [
    ...(equippedCard ? [equippedCard] : []),
    ...ownedCards.filter((pitt) => !pitt.isEquipped),
  ].slice(0, pairCount);

  if (selected.length < pairCount) {
    const responses = await Promise.all(
      Object.values(EXPLORER_COLLECTIONS).map(async ({ collection }) => {
        const total = COLLECTION_TOTALS[collection];
        const batchSize = Math.max(12, pairCount);
        const from = Math.floor(Math.random() * Math.max(1, total - batchSize));
        const response = await fetch(
          `https://api.multiversx.com/collections/${collection}/nfts?from=${from}&size=${batchSize}`,
        );
        if (!response.ok) throw new Error(`Unable to load ${collection}`);
        return response.json();
      }),
    );
    const selectedIds = new Set(selected.map((pitt) => pitt.id));
    const fillers = Array.from(
      new Map(
        responses
          .flat()
          .map((nft) => toMemoryPitt(nft, ownedIds, equippedPittz))
          .filter((pitt) => pitt.image && !selectedIds.has(pitt.id))
          .map((pitt) => [pitt.id, pitt]),
      ).values(),
    );
    selected = [...selected, ...shuffle(fillers).slice(0, pairCount - selected.length)];
  }

  if (selected.length < pairCount) throw new Error("Not enough Pittz were available");
  return shuffle(
    selected.flatMap((pitt) => [
      { ...pitt, cardId: `${pitt.id}-a` },
      { ...pitt, cardId: `${pitt.id}-b` },
    ]),
  );
}

function PittzMatch({ equippedPittz = null, walletPittz = [] }) {
  const walletPittzRef = useRef(walletPittz);
  const equippedPittzRef = useRef(equippedPittz);
  const [cards, setCards] = useState([]);
  const [openCards, setOpenCards] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [board, setBoard] = useState(DEFAULT_BOARD);
  const [bestMoves, setBestMoves] = useState(() => readBestMoves(DEFAULT_BOARD.pairs));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [started, setStarted] = useState(false);
  const [boardVersion, setBoardVersion] = useState(0);
  const timers = useRef([]);

  const completed = matchedPairs.length === board.pairs;

  useEffect(() => {
    let cancelled = false;
    fetchPittzBoard(walletPittzRef.current, equippedPittzRef.current, board.pairs)
      .then((nextCards) => {
        if (!cancelled) setCards(nextCards);
      })
      .catch((loadError) => {
        console.error("Pittz Memory board loading failed:", loadError);
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
  }, [boardVersion, board.pairs]);

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
        const completesBoard = matchedPairs.length + 1 === board.pairs;
        if (completesBoard && (!bestMoves || nextMoves < bestMoves)) {
          setBestMoves(nextMoves);
          try {
            window.localStorage.setItem(`${BEST_MOVES_KEY}-${board.pairs}-pairs`, String(nextMoves));
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

  function resetBoardState() {
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
  }

  function dealNewBoard() {
    resetBoardState();
    setBoardVersion((current) => current + 1);
  }

  function selectBoard(nextBoard) {
    if (loading || nextBoard.id === board.id) return;
    resetBoardState();
    setBestMoves(readBestMoves(nextBoard.pairs));
    setBoard(nextBoard);
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
          <h3>PITTZ MEMORY</h3>
          <p>Find all {board.pairs} matching CryptoPittz pairs.</p>
        </div>
        <button type="button" onClick={dealNewBoard} disabled={loading}>🔀 NEW PITTZ</button>
      </header>

      <div className="match-difficulty" aria-label="Choose Pittz Memory difficulty">
        <span>BOARD SIZE</span>
        <div>
          {BOARD_OPTIONS.map((option) => (
            <button
              className={board.id === option.id ? "active" : ""}
              type="button"
              onClick={() => selectBoard(option)}
              disabled={loading}
              aria-pressed={board.id === option.id}
              key={option.id}
            >
              <strong>{option.label}</strong>
              <small>{option.pairs} pairs</small>
            </button>
          ))}
        </div>
      </div>

      <div className="match-dashboard" aria-label="Game statistics">
        <div><span>Moves</span><strong>{moves}</strong></div>
        <div><span>Time</span><strong>{formatTime(seconds)}</strong></div>
        <div><span>Pairs</span><strong>{matchedPairs.length}/{board.pairs}</strong></div>
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
        <div
          className="match-board"
          style={{ "--match-columns": board.columns, "--match-mobile-columns": board.mobileColumns }}
        >
          {cards.map((card) => {
            const flipped = openCards.includes(card.cardId) || matchedPairs.includes(card.id);
            const matched = matchedPairs.includes(card.id);
            return (
              <button
                className={`match-card ${flipped ? "flipped" : ""} ${matched ? "matched" : ""} ${card.isOwned ? "owned-pitt" : ""} ${card.isEquipped ? "equipped-pitt" : ""}`}
                type="button"
                onClick={() => flipCard(card)}
                aria-label={flipped ? card.name : "Hidden CryptoPittz card"}
                aria-pressed={flipped}
                disabled={matched}
                key={card.cardId}
              >
                <span className="match-card-inner">
                  <span className="match-card-back" aria-hidden="true">
                    <img src="/images/cryptopittz-bonez-transparent.png" alt="" />
                    <small>PITTZ</small>
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
                    <small>{card.isEquipped ? `EQUIPPED • ${card.name}` : card.isOwned ? `OWNED • ${card.name}` : card.name}</small>
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
