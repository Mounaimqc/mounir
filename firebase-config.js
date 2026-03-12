// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCUcmmnvxjsZoDgQyESi5AvsynnH1kljFc",
  authDomain: "mounir-40df8.firebaseapp.com",
  projectId: "mounir-40df8",
  storageBucket: "mounir-40df8.firebasestorage.app",
  messagingSenderId: "855089551978",
  appId: "1:855089551978:web:dfd904eb3788d3504e4813",
  measurementId: "G-M680BM9Y77"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

console.log("✅ Firebase connecté avec succès!");


// ✅ Collections references - أسماء الكوليكشن الصحيحة حسب Firebase عندك
export const produitsCollection = collection(databases, "produits");
export const commandesCollection = collection(databases, "commandes"); // ← اسم الكوليكشن الصحيح

// ✅ Export كل اللي تحتاجه
export { databases, collection, query, where, orderBy, getDocs, doc, updateDoc };

console.log('✅ Firebase initialized successfully');

