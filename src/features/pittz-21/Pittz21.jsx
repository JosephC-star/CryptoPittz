import { useEffect, useState } from "react";

import { getNftImage } from "../../utils/nftUtils";
import {
  MINIMUM_STAKE,
  PACK_REFILL_POINTS,
  PALACE_STAKES,
  PITTZ_POINTS_KEY,
  STARTING_PITTZ_POINTS,
} from "../pittz-palace/palaceConfig";
import "./Pittz21.css";

const COLLECTIONS = [
  { id: "PITTZ-1a4c2d", total: 5310 },
  { id: "PITTZVICE-c3ec94", total: 1395 },
];
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function readBonez() {
  try {
    const saved = Number(window.localStorage.getItem(PITTZ_POINTS_KEY));
    return Number.isFinite(saved) && saved >= 0 ? saved : STARTING_PITTZ_POINTS;
  } catch {
    return STARTING_PITTZ_POINTS;
  }
}

function handValue(hand) {
  let value = hand.reduce((total, card) => {
    if (card.rank === "A") return total + 11;
    if (["J", "Q", "K"].includes(card.rank)) return total + 10;
    return total + Number(card.rank);
  }, 0);
  let aces = hand.filter((card) => card.rank === "A").length;
  while (value > 21 && aces > 0) {
    value -= 10;
    aces -= 1;
  }
  return value;
}

function isBlackjack(hand) {
  return hand.length === 2 && handValue(hand) === 21;
}

async function fetchPittzDeck() {
  const batches = await Promise.all(
    COLLECTIONS.map(async ({ id, total }) => {
      const from = Math.floor(Math.random() * Math.max(1, total - 30));
      const response = await fetch(
        `https://api.multiversx.com/collections/${id}/nfts?from=${from}&size=30`,
      );
      if (!response.ok) throw new Error(`Unable to load ${id}`);
      return response.json();
    }),
  );

  const pittz = shuffle(
    Array.from(
      new Map(
        batches
          .flat()
          .map((nft) => ({
            pittId: nft.identifier,
            name: nft.name || nft.identifier,
            image: getNftImage(nft),
          }))
          .filter((nft) => nft.image)
          .map((nft) => [nft.pittId, nft]),
      ).values(),
    ),
  );

  if (pittz.length < 52) throw new Error("Not enough Pittz were available for a full deck");

  const faces = shuffle(SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit }))));
  return faces.map((face, index) => ({ ...face, ...pittz[index], cardId: `${pittz[index].pittId}-${face.suit}-${face.rank}` }));
}

function PittzCard({ card, hidden = false }) {
  if (hidden) {
    return <div className="p21-card hidden" aria-label="Dealer card hidden"><div className="p21-card-logo"><img src="/images/cryptopittz-bonez.jpg" alt="" /></div><small>CRYPTOPITTZ</small></div>;
  }

  const red = card.suit === "♥" || card.suit === "♦";
  return (
    <div className={`p21-card dealt ${red ? "red" : "black"}`}>
      <div className="p21-rank"><b>{card.rank}</b><span>{card.suit}</span></div>
      <img
        src={card.image}
        alt={card.name}
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = "/images/cryptopittz-bonez.jpg";
        }}
      />
      <small>{card.name}</small>
    </div>
  );
}

function Pittz21() {
  const [deck, setDeck] = useState([]);
  const [player, setPlayer] = useState([]);
  const [dealer, setDealer] = useState([]);
  const [bonez, setBonez] = useState(readBonez);
  const [stake, setStake] = useState(25);
  const [roundBet, setRoundBet] = useState(25);
  const [phase, setPhase] = useState("ready");
  const [message, setMessage] = useState({ title: "PLACE YOUR BONEZ", text: "Deal when the Pack feels lucky." });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deckVersion, setDeckVersion] = useState(0);
  const [stats, setStats] = useState({ hands: 0, wins: 0, blackjacks: 0, streak: 0, bestStreak: 0 });

  useEffect(() => {
    let cancelled = false;
    fetchPittzDeck()
      .then((cards) => {
        if (!cancelled) {
          setDeck(cards);
          setPlayer([]);
          setDealer([]);
          setPhase("ready");
          setMessage({ title: "FRESH PITTZ DECK", text: "52 new Pittz are shuffled and ready." });
        }
      })
      .catch((loadError) => {
        console.error("Pittz 21 deck loading failed:", loadError);
        if (!cancelled) setError("The Pittz deck could not be loaded. Try a fresh shuffle.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [deckVersion]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PITTZ_POINTS_KEY, String(bonez));
    } catch {
      // The game remains playable if browser storage is unavailable.
    }
  }, [bonez]);

  function recordResult(won, blackjack = false) {
    setStats((current) => {
      const streak = won ? current.streak + 1 : 0;
      return {
        hands: current.hands + 1,
        wins: current.wins + (won ? 1 : 0),
        blackjacks: current.blackjacks + (blackjack ? 1 : 0),
        streak,
        bestStreak: Math.max(current.bestStreak, streak),
      };
    });
  }

  function settle(title, text, payout, bet, won = false, blackjack = false) {
    if (payout > 0) setBonez((current) => current + payout);
    setPhase("settled");
    setMessage({ title, text: `${text} ${payout ? `Payout: ${payout} BONEZ.` : `Lost: ${bet} BONEZ.`}` });
    recordResult(won, blackjack);
  }

  function runDealer(playerHand, dealerHand, remainingDeck, bet) {
    setPhase("dealer");
    setMessage({ title: "DEALER'S TURN", text: "The house Pitt is checking the table..." });
    window.setTimeout(() => {
      const nextDealer = [...dealerHand];
      const nextDeck = [...remainingDeck];
      while (handValue(nextDealer) < 17 && nextDeck.length) nextDealer.push(nextDeck.shift());
      setDealer(nextDealer);
      setDeck(nextDeck);
      const playerScore = handValue(playerHand);
      const dealerScore = handValue(nextDealer);
      if (dealerScore > 21) settle("DEALER BUSTS — WOOF WOOF!", "The house went over 21.", bet * 2, bet, true);
      else if (dealerScore > playerScore) settle("HOUSE PITT WINS", `${dealerScore} beats ${playerScore}.`, 0, bet);
      else if (dealerScore < playerScore) settle("PACK WIN!", `${playerScore} beats ${dealerScore}.`, bet * 2, bet, true);
      else settle("PUSH", `Both hands land on ${playerScore}.`, bet, bet);
    }, 650);
  }

  function deal() {
    if (loading || error || phase === "player" || phase === "dealer" || bonez < stake) return;
    if (deck.length < 10) {
      setMessage({ title: "DECK RUNNING LOW", text: "Load a New Pittz Deck before the next hand." });
      return;
    }
    const nextDeck = [...deck];
    const playerHand = [nextDeck.shift(), nextDeck.shift()];
    const dealerHand = [nextDeck.shift(), nextDeck.shift()];
    setDeck(nextDeck);
    setPlayer(playerHand);
    setDealer(dealerHand);
    setRoundBet(stake);
    setBonez((current) => current - stake);
    setPhase("player");
    setMessage({ title: "YOUR MOVE", text: "Hit, stand, or double down. The Pack is watching." });

    const playerNatural = isBlackjack(playerHand);
    const dealerNatural = isBlackjack(dealerHand);
    if (playerNatural || dealerNatural) {
      if (playerNatural && dealerNatural) settle("DOUBLE BLACKJACK PUSH", "Nobody takes the BONEZ.", stake, stake);
      else if (playerNatural) settle("NATURAL BLACKJACK!", "That is EXTRA MUSTY.", Math.floor(stake * 2.5), stake, true, true);
      else settle("DEALER BLACKJACK", "The house Pitt had it from the deal.", 0, stake);
    }
  }

  function hit() {
    if (phase !== "player" || !deck.length) return;
    const nextDeck = [...deck];
    const nextPlayer = [...player, nextDeck.shift()];
    setDeck(nextDeck);
    setPlayer(nextPlayer);
    const score = handValue(nextPlayer);
    if (score > 21) settle("BUSTED!", "The Pack smells fear.", 0, roundBet);
    else if (score === 21) runDealer(nextPlayer, dealer, nextDeck, roundBet);
  }

  function stand() {
    if (phase === "player") runDealer(player, dealer, deck, roundBet);
  }

  function doubleDown() {
    if (phase !== "player" || player.length !== 2 || bonez < roundBet || !deck.length) return;
    const nextDeck = [...deck];
    const nextPlayer = [...player, nextDeck.shift()];
    const doubledBet = roundBet * 2;
    setBonez((current) => current - roundBet);
    setRoundBet(doubledBet);
    setDeck(nextDeck);
    setPlayer(nextPlayer);
    if (handValue(nextPlayer) > 21) settle("DOUBLE-DOWN BUST!", "Questionable decision. We still respect it.", 0, doubledBet);
    else runDealer(nextPlayer, dealer, nextDeck, doubledBet);
  }

  function loadNewDeck() {
    if (phase === "player" || phase === "dealer") return;
    setLoading(true);
    setError("");
    setDeckVersion((current) => current + 1);
  }

  function refill() {
    setBonez(PACK_REFILL_POINTS);
    setMessage({ title: "PACK REFILL!", text: `${PACK_REFILL_POINTS} free game BONEZ. Do something questionable.` });
  }

  const dealerHidden = phase === "player";
  const playerScore = handValue(player);
  const dealerScore = dealerHidden ? (dealer[0] ? handValue([dealer[0]]) : 0) : handValue(dealer);

  return (
    <div className="pittz21-table">
      <header className="p21-header">
        <div><span>BLACKJACK — PACK RULES</span><h3>PITTZ 21</h3></div>
        <button type="button" onClick={loadNewDeck} disabled={loading || phase === "player" || phase === "dealer"}>🔀 NEW PITTZ DECK</button>
      </header>

      <div className="p21-dashboard">
        <div><span>BONEZ</span><strong>{bonez.toLocaleString()}</strong></div>
        <div><span>BET</span><strong>{phase === "player" || phase === "dealer" ? roundBet : stake} BONEZ</strong></div>
        <div><span>DECK</span><strong>{deck.length}/52</strong></div>
        <div><span>BEST STREAK</span><strong>{stats.bestStreak}</strong></div>
      </div>

      {loading && <div className="p21-loading">Shuffling 52 fresh CryptoPittz...</div>}
      {error && <div className="p21-loading error"><span>{error}</span><button type="button" onClick={loadNewDeck}>Try Again</button></div>}

      {!loading && !error && (
        <>
          <section className="p21-hand dealer-hand">
            <div className="p21-hand-label"><span>HOUSE PITT</span><strong>{dealerScore || "—"}</strong></div>
            <div className="p21-cards">
              {dealer.map((card, index) => <PittzCard card={card} hidden={dealerHidden && index === 1} key={card.cardId} />)}
            </div>
          </section>

          <div className={`p21-message ${phase}`} aria-live="polite"><strong>{message.title}</strong><span>{message.text}</span></div>

          <section className="p21-hand player-hand">
            <div className="p21-hand-label"><span>YOUR PACK</span><strong>{playerScore || "—"}</strong></div>
            <div className="p21-cards">
              {player.map((card) => <PittzCard card={card} key={card.cardId} />)}
            </div>
          </section>

          <div className="p21-controls">
            <div className="p21-stakes">
              {PALACE_STAKES.map((amount) => (
                <button type="button" className={stake === amount ? "active" : ""} disabled={phase === "player" || phase === "dealer"} onClick={() => setStake(amount)} key={amount}>{amount}</button>
              ))}
            </div>
            {phase === "player" ? (
              <div className="p21-actions">
                <button type="button" onClick={hit}>HIT</button>
                <button type="button" onClick={stand}>STAND</button>
                <button type="button" onClick={doubleDown} disabled={player.length !== 2 || bonez < roundBet}>DOUBLE DOWN</button>
              </div>
            ) : (
              <button className="p21-deal" type="button" onClick={deal} disabled={bonez < stake || deck.length < 10}>DEAL {stake} BONEZ</button>
            )}
            {bonez < MINIMUM_STAKE && phase !== "player" && phase !== "dealer" && <button className="p21-refill" type="button" onClick={refill}>🐾 PACK REFILL +{PACK_REFILL_POINTS}</button>}
          </div>

          <div className="p21-stats"><span>Hands <b>{stats.hands}</b></span><span>Wins <b>{stats.wins}</b></span><span>Blackjacks <b>{stats.blackjacks}</b></span><span>Current streak <b>{stats.streak}</b></span></div>
          <details className="p21-rules"><summary>📜 Pittz 21 Rules &amp; Payouts</summary><p>Dealer hits through 16 and stands on 17. Regular wins pay 1:1, natural blackjack pays 3:2, and a push returns your bet. Double Down adds one matching bet and deals exactly one final card.</p></details>
        </>
      )}

      <p className="p21-disclaimer"><strong>Game BONEZ disclaimer:</strong> these free in-game points are not $BONEZ, cryptocurrency, or anything of cash/token value. No purchase required.</p>
    </div>
  );
}

export default Pittz21;
