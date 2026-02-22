import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBdp9QFdWzd2Kar5-yCv8pqOw5PkzkyMfc",
  authDomain: "midnight-meld.firebaseapp.com",
  projectId: "midnight-meld",
  storageBucket: "midnight-meld.firebasestorage.app",
  messagingSenderId: "475894313416",
  appId: "1:475894313416:web:49a2cdea96a0d64c8c50fd",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);