import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useEffect, useState } from "react";
import { createDeck, shuffleDeck, dealCards } from "../utils/gameEngine";

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [sortedHand, setSortedHand] = useState(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [lastDrawnCardId, setLastDrawnCardId] = useState(null);
  const [drawnFromDiscard, setDrawnFromDiscard] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "rooms", roomId),
      (docSnap) => {
        if (docSnap.exists()) {
          setRoom(docSnap.data());
          setHasDrawn(false);
          setLastDrawnCardId(null);
          setDrawnFromDiscard(false);
        } else {
          navigate("/lobby");
        }
      }
    );

    return () => unsubscribe();
  }, [roomId, navigate]);

  if (!room) return <div className="p-10">Loading...</div>;

  const isHost = room.hostId === auth.currentUser.uid;
  const isMyTurn = room.currentTurn === auth.currentUser.uid;

  const myPlayer = room.players.find(
    (p) => p.uid === auth.currentUser.uid
  );

  const myHand = myPlayer?.hand || [];

  const rankOrder = [
    "A","K","Q","J","10","9","8","7","6","5","4","3","2"
  ];
  const suitOrder = ["♠", "♥", "♣", "♦"];

  const sortHand = () => {
    const sorted = [...myHand].sort((a, b) => {
      const rankCompare =
        rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
      if (rankCompare !== 0) return rankCompare;
      return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
    });
    setSortedHand(sorted);
  };

  const displayHand = sortedHand || myHand;

  // ---------------- START GAME ----------------

  const startGame = async () => {
    const playerCount = room.players.length;

    let deck = createDeck();
    deck = shuffleDeck(deck);

    const { hands, remainingDeck } = dealCards(deck, playerCount);

    const updatedPlayers = room.players.map((player, index) => ({
      ...player,
      hand: hands[index]
    }));

    const discardPile = [remainingDeck.shift()];

    await updateDoc(doc(db, "rooms", roomId), {
      status: "playing",
      players: updatedPlayers,
      drawPile: remainingDeck,
      discardPile,
      currentTurn: room.players[0].uid,
      round: 1
    });
  };

  // ---------------- DRAW ----------------

  const drawFromPile = async (type) => {
    if (!isMyTurn || hasDrawn) return;

    let drawPile = [...room.drawPile];
    let discardPile = [...room.discardPile];

    if (drawPile.length === 0) {
      if (discardPile.length <= 1) return;

      const topCard = discardPile.shift();
      drawPile = shuffleDeck(discardPile);
      discardPile = [topCard];
    }

    let drawnCard;

    if (type === "draw") {
      drawnCard = drawPile.shift();
      setDrawnFromDiscard(false);
    } else {
      drawnCard = discardPile.shift();
      setDrawnFromDiscard(true);
    }

    const updatedPlayers = room.players.map((player) => {
      if (player.uid === auth.currentUser.uid) {
        return {
          ...player,
          hand: [...player.hand, drawnCard]
        };
      }
      return player;
    });

    await updateDoc(doc(db, "rooms", roomId), {
      players: updatedPlayers,
      drawPile,
      discardPile
    });

    setLastDrawnCardId(drawnCard.id);
    setHasDrawn(true);
  };

  // ---------------- DISCARD ----------------

  const discardCard = async (card) => {
    if (!isMyTurn || !hasDrawn) return;

    // 🚫 Prevent discarding card drawn from discard in same turn
    if (drawnFromDiscard && card.id === lastDrawnCardId) {
      alert("You cannot discard the card you just picked from discard pile.");
      return;
    }

    const updatedPlayers = room.players.map((player) => {
      if (player.uid === auth.currentUser.uid) {
        return {
          ...player,
          hand: player.hand.filter((c) => c.id !== card.id)
        };
      }
      return player;
    });

    const updatedDiscard = [card, ...room.discardPile];

    const currentIndex = room.players.findIndex(
      (p) => p.uid === room.currentTurn
    );

    const nextIndex =
      (currentIndex + 1) % room.players.length;

    const nextTurn = room.players[nextIndex].uid;

    await updateDoc(doc(db, "rooms", roomId), {
      players: updatedPlayers,
      discardPile: updatedDiscard,
      currentTurn: nextTurn
    });

    setSortedHand(null);
    setHasDrawn(false);
    setLastDrawnCardId(null);
    setDrawnFromDiscard(false);
  };

  const leaveRoom = async () => {
    const updatedPlayers = room.players.filter(
      (p) => p.uid !== auth.currentUser.uid
    );

    await updateDoc(doc(db, "rooms", roomId), {
      players: updatedPlayers
    });

    navigate("/lobby");
  };

  return (
    <div className="p-10 min-h-screen text-white">
      <h1 className="text-2xl text-teal mb-4">
        Room Code: {room.inviteCode}
      </h1>

      {room.status === "waiting" && (
        <>
          <h2>Players:</h2>
          <ul className="mb-4">
            {room.players.map((player, index) => (
              <li key={index}>
                {player.displayName}
                {player.uid === room.hostId && " (Host)"}
              </li>
            ))}
          </ul>

          {isHost && (
            <button
              className="bg-teal px-6 py-2 rounded"
              onClick={startGame}
            >
              Start Game
            </button>
          )}
        </>
      )}

      {room.status === "playing" && (
        <>
          <h2 className="text-cyan-400 mb-2">Game Started</h2>

          <p>Current Turn: {room.currentTurn}</p>
          <p>Draw Pile: {room.drawPile?.length} cards</p>
          <p>Top Discard: {room.discardPile?.[0]?.id}</p>

          {isMyTurn && !hasDrawn && (
            <div className="mt-4 space-x-4">
              <button
                className="bg-green-600 px-4 py-2 rounded"
                onClick={() => drawFromPile("draw")}
              >
                Draw from Deck
              </button>

              <button
                className="bg-yellow-600 px-4 py-2 rounded"
                onClick={() => drawFromPile("discard")}
              >
                Draw from Discard
              </button>
            </div>
          )}

          <h3 className="mt-6 mb-2">Your Hand:</h3>

          <div className="flex flex-wrap gap-2 mb-4">
            {displayHand.map((card) => (
              <div
                key={card.id}
                className={`px-3 py-2 rounded cursor-pointer ${
                  isMyTurn && hasDrawn
                    ? "bg-red-700"
                    : "bg-gray-800"
                }`}
                onClick={() => discardCard(card)}
              >
                {card.id}
              </div>
            ))}
          </div>

          <button
            className="bg-cyan px-4 py-2 rounded"
            onClick={sortHand}
          >
            Sort My Hand
          </button>
        </>
      )}

      <button
        className="bg-red-500 px-6 py-2 rounded mt-6"
        onClick={leaveRoom}
      >
        Leave Room
      </button>
    </div>
  );
}