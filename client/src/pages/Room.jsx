import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useEffect, useState } from "react";

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
    await updateDoc(doc(db, "rooms", roomId), {
      status: "playing"
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
    <div className="p-10 min-h-screen bg-midnight text-white">
      <h1 className="text-2xl text-teal mb-4">
        Room Code: {room.inviteCode}
      </h1>

      <h2 className="mb-2">Players:</h2>

      <ul className="mb-4">
        {room.players.map((player, index) => (
          <li key={index}>
            {player.displayName}
            {player.uid === room.hostId && " (Host)"}
          </li>
        ))}
      </ul>

      {isHost && room.status === "waiting" && (
        <button
          className="bg-teal px-6 py-2 rounded mb-4"
          onClick={startGame}
        >
          Start Game
        </button>
      )}

      <button
        className="bg-red-500 px-6 py-2 rounded"
        onClick={leaveRoom}
      >
        Leave Room
      </button>
    </div>
  );
}