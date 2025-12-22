// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyASbrebW7Jgs7Bw8nEGGmWxq2aCU_-hmME",
  authDomain: "vue-hdl.firebaseapp.com",
  projectId: "vue-hdl",
  storageBucket: "vue-hdl.firebasestorage.app",
  messagingSenderId: "619249760044",
  appId: "1:619249760044:web:550cb4219b9a4dda909e89"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// 封裝一些好用的函式
export const login = () => signInWithPopup(auth, provider);
export const logout = () => signOut(auth);

export { auth, db };