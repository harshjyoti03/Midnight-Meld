import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const login = async () => {
    try {
      setError("");
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/lobby");
    } catch (err) {
      setError(err.message);
    }
  };

  const register = async () => {
    try {
      setError("");
      await createUserWithEmailAndPassword(auth, email, password);
      navigate("/lobby");
    } catch (err) {
      setError(err.message);
    }
  };

  const googleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate("/lobby");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold text-teal mb-6">
        Midnight Meld
      </h1>

      <input
        className="mb-2 p-2 rounded text-black"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="mb-2 p-2 rounded text-black"
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && (
        <p className="text-red-400 mb-3 text-sm">
          {error}
        </p>
      )}

      <button
        className="bg-teal px-6 py-2 rounded mb-2"
        onClick={login}
      >
        Login
      </button>

      <button
        className="bg-cyan px-6 py-2 rounded mb-4"
        onClick={register}
      >
        Register
      </button>

      <button
        className="bg-white text-black px-6 py-2 rounded"
        onClick={googleLogin}
      >
        Login with Google
      </button>
    </div>
  );
}