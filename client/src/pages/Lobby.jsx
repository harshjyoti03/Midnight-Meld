import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function Lobby() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl text-teal mb-4">
        Welcome to Midnight Meld
      </h1>

      <button className="bg-teal px-6 py-2 rounded mb-3">
        Create Room
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