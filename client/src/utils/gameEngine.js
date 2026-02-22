// client/src/utils/gameEngine.js

export const SUITS = ["♠", "♥", "♦", "♣"];

export const RANKS = [
  { rank: "A", value: 15 },
  { rank: "2", value: 2 },
  { rank: "3", value: 3 },
  { rank: "4", value: 4 },
  { rank: "5", value: 5 },
  { rank: "6", value: 6 },
  { rank: "7", value: 7 },
  { rank: "8", value: 8 },
  { rank: "9", value: 9 },
  { rank: "10", value: 10 },
  { rank: "J", value: 10 },
  { rank: "Q", value: 10 },
  { rank: "K", value: 10 }
];

export function createDeck() {
  const deck = [];

  for (let suit of SUITS) {
    for (let rankObj of RANKS) {
      deck.push({
        id: `${rankObj.rank}${suit}`,
        suit,
        rank: rankObj.rank,
        value: rankObj.value
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

  if (playerCount === 2) cardsPerPlayer = 10;
  if (playerCount === 3 || playerCount === 4) cardsPerPlayer = 7;
  if (playerCount === 5 || playerCount === 6) cardsPerPlayer = 6;

  const hands = [];

  for (let i = 0; i < playerCount; i++) {
    hands.push(deck.splice(0, cardsPerPlayer));
  }

  return { hands, remainingDeck: deck };
}