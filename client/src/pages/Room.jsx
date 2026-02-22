import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useEffect, useState } from "react";
import { createDeck, shuffleDeck, dealCards } from "../utils/gameEngine";

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);

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
      direction: 1,
      round: 1
    });
  };

  const leaveRoom = async () => {
    const user = auth.currentUser;

    const updatedPlayers = room.players.filter(
      (p) => p.uid !== user.uid
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
          <h2 className="mb-2">Players:</h2>
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
              className="bg-teal px-6 py-2 rounded mb-4"
              onClick={startGame}
            >
              Start Game
            </button>
          )}
        </>
      )}

      {room.status === "playing" && (
        <>
          <h2 className="mb-4 text-cyan-400">
            Game Started
          </h2>

          <p>Current Turn: {room.currentTurn}</p>
          <p>Draw Pile: {room.drawPile?.length} cards</p>
          <p>Top Discard: {room.discardPile?.[0]?.id}</p>

          <h3 className="mt-4 mb-2">Your Hand:</h3>

          <div className="flex flex-wrap gap-2">
            {room.players
              .find(p => p.uid === auth.currentUser.uid)
              ?.hand?.map(card => (
                <div
                  key={card.id}
                  className="px-3 py-2 bg-gray-800 rounded"
                >
                  {card.id}
                </div>
              ))}
          </div>
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