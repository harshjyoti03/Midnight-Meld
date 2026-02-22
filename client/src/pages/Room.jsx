// FULL UPDATED ROOM.JSX

import { calculateHandScore } from "../utils/gameEngine";
import { canLayOff } from "../utils/gameEngine";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useEffect, useState } from "react";
import {
  createDeck,
  shuffleDeck,
  dealCards,
  isValidSet,
  isValidRun
} from "../utils/gameEngine";

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);

  const [hasDrawn, setHasDrawn] = useState(false);
  const [lastDrawnCardId, setLastDrawnCardId] = useState(null);
  const [drawnFromDiscard, setDrawnFromDiscard] = useState(false);
  const [selectedCards, setSelectedCards] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "rooms", roomId),
      (docSnap) => {
        if (docSnap.exists()) {
          setRoom(docSnap.data());
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
  const currentTurnPlayer = room.players?.find(
    p => p.uid === room.currentTurn
  );

  const myPlayer = room.players?.find(
    (p) => p.uid === auth.currentUser.uid
  );
  const myHand = myPlayer?.hand || [];

  // ---------------- AUTO SORT ----------------

  const rankOrder = [
    "A","K","Q","J","10","9","8","7","6","5","4","3","2"
  ];
  const suitOrder = ["♠", "♥", "♣", "♦"];

  const sortedHand = [...myHand].sort((a, b) => {
    const rankCompare =
      rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
    if (rankCompare !== 0) return rankCompare;
    return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
  });

  // ---------------- START GAME ----------------

  const startGame = async () => {
    const playerCount = room.players.length;

    let deck = createDeck();
    deck = shuffleDeck(deck);

    const { hands, remainingDeck } = dealCards(deck, playerCount);

    const playerColors = [
        "text-red-400",
        "text-blue-400",
        "text-green-400",
        "text-yellow-400",
        "text-purple-400",
        "text-pink-400"
    ];

    const updatedPlayers = room.players.map((player, index) => ({
      ...player,
      hand: hands[index],
      color: player.color || playerColors[index % playerColors.length]
    }));

    const discardPile = [remainingDeck.shift()];

    await updateDoc(doc(db, "rooms", roomId), {
      status: "playing",
        players: updatedPlayers,
        drawPile: remainingDeck,
        discardPile,
        currentTurn: room.players[0].uid,
        round: (room.round || 0) + 1,
        tableMelds: [],
        scores: room.scores || room.players.reduce((acc, p) => {
            acc[p.uid] = 0;
            return acc;
        }, {})
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

  // ---------------- SELECT ----------------

  const toggleSelect = (card) => {
    if (!isMyTurn || !hasDrawn) return;

    setSelectedCards(prev => {
      if (prev.find(c => c.id === card.id)) {
        return prev.filter(c => c.id !== card.id);
      }
      return [...prev, card];
    });
  };

  // ---------------- MELD ----------------

  const meldCards = async () => {
    if (!isMyTurn || !hasDrawn) return;
    if (selectedCards.length < 3) return;

    if (!isValidSet(selectedCards) && !isValidRun(selectedCards)) {
      alert("Invalid Meld");
      return;
    }

    const updatedPlayers = room.players.map(player => {
      if (player.uid === auth.currentUser.uid) {
        return {
          ...player,
          hand: player.hand.filter(
            c => !selectedCards.find(s => s.id === c.id)
          )
        };
      }
      return player;
    });

    const newMeld = {
      type: isValidSet(selectedCards) ? "set" : "run",
        createdBy: auth.currentUser.uid,
        cards: selectedCards.map(card => ({
            ...card,
            addedBy: auth.currentUser.uid
        }))
    };

    await updateDoc(doc(db, "rooms", roomId), {
      players: updatedPlayers,
      tableMelds: [...(room.tableMelds || []), newMeld]
    });

    setSelectedCards([]);
  };

  // ---------------- LAY OFF ----------------

  const layOffCard = async (card, meldIndex) => {
    if (!isMyTurn || !hasDrawn) return;

    const meld = room.tableMelds[meldIndex];

    if (!canLayOff(card, meld)) {
        alert("Invalid Layoff");
        return;
    }

    const updatedPlayers = room.players.map(player => {
        if (player.uid === auth.currentUser.uid) {
        return {
            ...player,
            hand: player.hand.filter(c => c.id !== card.id)
        };
        }
        return player;
    });

    const updatedMelds = [...room.tableMelds];
    updatedMelds[meldIndex] = {
        ...meld,
        cards: [
            ...meld.cards,
            { ...card, addedBy: auth.currentUser.uid }
        ]
    };

    await updateDoc(doc(db, "rooms", roomId), {
        players: updatedPlayers,
        tableMelds: updatedMelds
    });

    setSelectedCards([]);
  };

  // ---------------- DISCARD ----------------

  const discardCard = async (card) => {
    if (!isMyTurn || !hasDrawn) return;

    if (drawnFromDiscard && card.id === lastDrawnCardId) {
      alert("Cannot discard picked discard card this turn.");
      return;
    }

    const updatedPlayers = room.players.map(player => {
      if (player.uid === auth.currentUser.uid) {
        return {
          ...player,
          hand: player.hand.filter(c => c.id !== card.id)
        };
      }
      return player;
    });

    const updatedDiscard = [card, ...room.discardPile];

    const currentIndex = room.players.findIndex(
      p => p.uid === room.currentTurn
    );
    const nextIndex =
      (currentIndex + 1) % room.players.length;

    // Check if player emptied hand
    const updatedCurrentPlayer = updatedPlayers.find(
        p => p.uid === auth.currentUser.uid
    );

    if (updatedCurrentPlayer.hand.length === 0) {
        const newScores = { ...room.scores };

        const winnerUid = auth.currentUser.uid;

        updatedPlayers.forEach(player => {
            const playerMeldPoints = (room.tableMelds || [])
                .filter(m => m.createdBy === player.uid)
                .reduce((total, meld) =>
                    total + meld.cards.reduce((t, c) => t + c.value, 0),
                0);

            const leftoverPoints = calculateHandScore(player.hand);

            let roundTotal = 0;

            if (player.uid === winnerUid) {
                // Winner only gets meld points
                roundTotal = playerMeldPoints;
            } else {
                // Others: meld points minus leftover
                roundTotal = playerMeldPoints - leftoverPoints;
            }

            newScores[player.uid] =
                (newScores[player.uid] || 0) + roundTotal;
        });

        const winnerScore = newScores[winnerUid];

        await updateDoc(doc(db, "rooms", roomId), {
            players: updatedPlayers,
            discardPile: updatedDiscard,
            scores: newScores,
            status: winnerScore >= 500 ? "game_over" : "round_over"
        });

        return;
    }

    await updateDoc(doc(db, "rooms", roomId), {
        players: updatedPlayers,
        discardPile: updatedDiscard,
        currentTurn: room.players[nextIndex].uid
    });

    setHasDrawn(false);
    setSelectedCards([]);
    setLastDrawnCardId(null);
    setDrawnFromDiscard(false);
  };

  return (
    <div className="p-10 text-white relative">
        <div className="absolute top-4 right-6 text-sm text-cyan-300 text-right">
            <div>Players: {room.players?.length || 0}</div>
            <div className="text-yellow-400">
                Turn: {currentTurnPlayer?.displayName || "-"}
            </div>
        </div>

      <h2 className="mb-4">Room Code: {room.inviteCode}</h2>

      <h3 className="mt-4 text-yellow-400">Scores:</h3>
      <ul className="mb-4">
        {room.players?.map(player => {
            const isMe = player.uid === auth.currentUser.uid;

            return (
            <li
                key={player.uid}
                className={`${player.color} ${isMe ? "font-bold" : ""}`}
            >
                {player.displayName}
                {isMe && " (YOU)"}:{" "}
                {room.scores?.[player.uid] || 0}
            </li>
            );
        })}
      </ul>

      {/* WAITING ROOM */}
      {room.status === "waiting" && (
        <>
          <h3>Players:</h3>
          <ul className="mb-4">
            {room.players?.map(player => (
              <li
                key={player.uid}
                className={`${
                    room.currentTurn === player.uid
                    ? "text-green-400 font-bold"
                    : ""
                }`}
              >
                {player.displayName}
                {player.uid === room.hostId && " (Host)"}
              </li>
            ))}
          </ul>

          {isHost && (
            <button
              className="bg-green-600 px-4 py-2 rounded"
              onClick={startGame}
            >
              Start Game
            </button>
          )}
        </>
      )}

      {/* PLAYING STATE */}
      {room.status === "playing" && (
        <>
          <h3 className="text-lg font-semibold mb-2">
            {isMyTurn ? (
                <span className="text-green-400">Your Turn</span>
            ) : (
                <span>
                Turn:{" "}
                <span className="text-yellow-400">
                    {currentTurnPlayer?.displayName || "Loading..."}
                </span>
                </span>
            )}
          </h3>

          <div className="flex gap-6 my-4">
            <div>
                Draw Pile: {room.drawPile?.length || 0} cards
            </div>

            <div>
                Top Discard: {room.discardPile?.[0]?.id || "None"}
            </div>
          </div>

          {isMyTurn && !hasDrawn && (
            <div className="space-x-4 my-4">
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

          <h3>Your Hand:</h3>
          <div className="flex gap-2 flex-wrap mb-4">
            {sortedHand.map(card => (
              <div
                key={card.id}
                onClick={() => toggleSelect(card)}

                className={`px-3 py-2 rounded cursor-pointer border ${
                    selectedCards.find(c => c.id === card.id)
                        ? "bg-blue-600 border-blue-300 scale-105"
                        : card.id === lastDrawnCardId
                        ? "bg-purple-600 border-purple-300"
                        : "bg-gray-800 border-gray-600"
                }`}
                >
                {card.id}
              </div>
            ))}
          </div>

          {isMyTurn && hasDrawn && selectedCards.length >= 3 && (
            <button
              className="bg-cyan-600 px-4 py-2 rounded mb-4"
              onClick={meldCards}
            >
              Meld Selected Cards
            </button>
          )}
          {isMyTurn && hasDrawn && selectedCards.length === 1 && (
            <button
                className="bg-red-600 px-4 py-2 rounded mb-4 ml-4"
                onClick={() => discardCard(selectedCards[0])}
            >
                Discard Selected Card
            </button>
          )}

          <p className="mb-2 text-cyan-300">
            Select cards to Meld.  
            Select exactly 1 card to enable Discard.
          </p>

          <h3>Table Melds:</h3>
          <div className="flex gap-4 flex-wrap">
            {room.tableMelds?.map((meld, index) => (
              <div
                key={index}
                className="border p-2 rounded cursor-pointer hover:bg-gray-700"
                onClick={() => {
                    if (selectedCards.length === 1) {
                    layOffCard(selectedCards[0], index);
                    }
                }}
                >
                <div className="mb-1">
                    <span className="font-semibold">
                        {meld.type.toUpperCase()}
                    </span>
                    {" — "}
                    <span
                        className={
                        room.players.find(p => p.uid === meld.createdBy)?.color
                        }
                    >
                        {
                        room.players.find(p => p.uid === meld.createdBy)
                            ?.displayName || "Unknown"
                        }
                    </span>
                </div>
                
                <div className="flex gap-1">
                  {meld.cards.map(card => {
                    const player = room.players.find(
                        p => p.uid === card.addedBy
                    );

                    return (
                        <span
                        key={card.id}
                        className={`px-2 py-1 rounded border ${
                            player?.color || "text-white"
                        }`}
                        title={`Added by ${player?.displayName}`}
                        >
                        {card.id}
                        </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {/* ROUND OVER STATE */}
      {room.status === "round_over" && (
        <div className="mt-6 p-4 bg-gray-800 rounded">
            <h2 className="text-green-400 text-lg mb-2">
            Round Over!
            </h2>
            {isHost && (
            <button
                className="bg-green-700 px-4 py-2 rounded"
                onClick={startGame}
            >
                Start Next Round
            </button>
            )}
        </div>
      )}

      {/* GAME OVER STATE */}
      {room.status === "game_over" && (
        <div className="mt-6 p-4 bg-red-900 rounded">
            <h2 className="text-red-400 text-xl">
            Game Over!
            </h2>
            <p className="mt-2">
            Winner:{" "}
            <span className="text-yellow-400 font-bold">
                {Object.keys(room.scores || {}).reduce((a, b) =>
                room.scores[a] > room.scores[b] ? a : b
                )}
            </span>
            </p>
        </div>
      )}


      <button
        className="bg-red-500 px-4 py-2 rounded mt-8"
        onClick={async () => {
            const updatedPlayers = room.players.filter(
                p => p.uid !== auth.currentUser.uid
            );

            await updateDoc(doc(db, "rooms", roomId), {
                players: updatedPlayers
            });

            navigate("/lobby");
        }}
        >
        Leave Room
      </button>
    </div>
  );
}