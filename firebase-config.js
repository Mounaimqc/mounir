// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCUcmmnvxjsZoDgQyESi5AvsynnH1kljFc",
  authDomain: "mounir-40df8.firebaseapp.com",
  projectId: "mounir-40df8",
  storageBucket: "mounir-40df8.firebasestorage.app",
  messagingSenderId: "855089551978",
  appId: "1:855089551978:web:dfd904eb3788d3504e4813",
  measurementId: "G-M680BM9Y77"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

console.log("✅ Firebase initialisé avec succès!");