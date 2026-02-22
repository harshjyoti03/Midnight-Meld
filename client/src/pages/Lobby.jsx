import { useState } from "react";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
  doc
} from "firebase/firestore";

function generateInviteCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function Lobby() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const createRoom = async () => {
    const user = auth.currentUser;
    const inviteCode = generateInviteCode();

    const docRef = await addDoc(collection(db, "rooms"), {
      inviteCode,
      hostId: user.uid,
      players: [
        {
          uid: user.uid,
          displayName: user.email,
          isBot: false
        }
      ],
      maxPlayers: 6,
      status: "waiting",
      createdAt: serverTimestamp()
    });

    navigate(`/room/${docRef.id}`);
  };

  const joinRoom = async () => {
    if (!joinCode) return;

    const q = query(
      collection(db, "rooms"),
      where("inviteCode", "==", joinCode)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      alert("Room not found");
      return;
    }

    const roomDoc = querySnapshot.docs[0];
    const roomData = roomDoc.data();

    if (roomData.players.length >= roomData.maxPlayers) {
      alert("Room is full");
      return;
    }

    const user = auth.currentUser;

    // Prevent duplicate join
    if (roomData.players.some(p => p.uid === user.uid)) {
      navigate(`/room/${roomDoc.id}`);
      return;
    }

    const updatedPlayers = [
      ...roomData.players,
      {
        uid: user.uid,
        displayName: user.email,
        isBot: false
      }
    ];

    await updateDoc(doc(db, "rooms", roomDoc.id), {
      players: updatedPlayers
    });

    navigate(`/room/${roomDoc.id}`);
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl text-teal mb-6">
        Welcome to Midnight Meld
      </h1>

      <button
        className="bg-teal px-6 py-2 rounded mb-4"
        onClick={createRoom}
      >
        Create Room
      </button>

      <input
        className="mb-2 p-2 rounded text-black"
        placeholder="Enter Invite Code"
        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
      />

      <button
        className="bg-cyan px-6 py-2 rounded mb-6"
        onClick={joinRoom}
      >
        Join Room
      </button>

      <button
        className="bg-red-500 px-6 py-2 rounded"
        onClick={handleLogout}
      >
        Logout
      </button>
    </div>
  );
}