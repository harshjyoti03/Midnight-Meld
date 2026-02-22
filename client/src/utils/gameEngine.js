// client/src/utils/gameEngine.js

export const SUITS = ["♠", "♥", "♦", "♣"];

export const RANKS = [
  { rank: "A", value: 15, order: 1 },
  { rank: "2", value: 2, order: 2 },
  { rank: "3", value: 3, order: 3 },
  { rank: "4", value: 4, order: 4 },
  { rank: "5", value: 5, order: 5 },
  { rank: "6", value: 6, order: 6 },
  { rank: "7", value: 7, order: 7 },
  { rank: "8", value: 8, order: 8 },
  { rank: "9", value: 9, order: 9 },
  { rank: "10", value: 10, order: 10 },
  { rank: "J", value: 10, order: 11 },
  { rank: "Q", value: 10, order: 12 },
  { rank: "K", value: 10, order: 13 }
];

export function createDeck() {
  const deck = [];
  for (let suit of SUITS) {
    for (let r of RANKS) {
      deck.push({
        id: `${r.rank}${suit}`,
        suit,
        rank: r.rank,
        value: r.value,
        order: r.order
      });
    }
  }
  return deck;
}

export function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function dealCards(deck, playerCount) {
  let cardsPerPlayer = 10;
  if (playerCount === 3 || playerCount === 4) cardsPerPlayer = 7;
  if (playerCount === 5 || playerCount === 6) cardsPerPlayer = 6;

  const hands = [];
  for (let i = 0; i < playerCount; i++) {
    hands.push(deck.splice(0, cardsPerPlayer));
  }

  return { hands, remainingDeck: deck };
}

// ---------- MELD VALIDATION ----------

export function isValidSet(cards) {
  if (cards.length < 3 || cards.length > 4) return false;

  const rank = cards[0].rank;
  const suits = new Set();

  for (let c of cards) {
    if (c.rank !== rank) return false;
    if (suits.has(c.suit)) return false;
    suits.add(c.suit);
  }

  return true;
}

export function isValidRun(cards) {
  if (cards.length < 3) return false;

  const suit = cards[0].suit;
  if (!cards.every(c => c.suit === suit)) return false;

  const sorted = [...cards].sort((a, b) => a.order - b.order);

  // Try circular validation
  for (let i = 0; i < sorted.length; i++) {
    let valid = true;

    for (let j = 1; j < sorted.length; j++) {
      const prev = sorted[(i + j - 1) % sorted.length];
      const curr = sorted[(i + j) % sorted.length];

      if ((prev.order % 13) + 1 !== curr.order) {
        valid = false;
        break;
      }
    }

    if (valid) return true;
  }

  return false;
}

// ---------- LAYOFF VALIDATION ----------

export function canLayOff(card, meld) {
  if (meld.type === "set") {
    if (card.rank !== meld.cards[0].rank) return false;

    const existingSuits = new Set(meld.cards.map(c => c.suit));
    if (existingSuits.has(card.suit)) return false;

    return meld.cards.length < 4;
  }

  if (meld.type === "run") {
    if (card.suit !== meld.cards[0].suit) return false;

    const orders = meld.cards.map(c => c.order).sort((a, b) => a - b);

    const min = orders[0];
    const max = orders[orders.length - 1];

    // normal extension
    if (card.order === min - 1) return true;
    if (card.order === max + 1) return true;

    // circular K-A-2 handling
    if (min === 1 && max === 13) {
      if (card.order === 2) return true;
    }

    return false;
  }

  return false;
}

// ---------- SCORE CALCULATION ----------

export function calculateHandScore(hand) {
  return hand.reduce((total, card) => total + card.value, 0);
}