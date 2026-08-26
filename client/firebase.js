// firebase.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC5ipvCJS-MiNMe08RUhbc8jCqpmM_J2ac",
  authDomain: "bibleques.firebaseapp.com",
  projectId: "bibleques",
  storageBucket: "bibleques.firebasestorage.app",
  messagingSenderId: "199312681971",
  appId: "1:199312681971:web:c04b19e4cd972ea0198086"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firestore database
const db = getFirestore(app);

// Authentication
const auth = getAuth(app);

export { db, auth };