// firebase-config.js
//import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
//import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

//const firebaseConfig = {
//  apiKey: "AIzaSyCUcmmnvxjsZoDgQyESi5AvsynnH1kljFc",
//  authDomain: "mounir-40df8.firebaseapp.com",
//  projectId: "mounir-40df8",
//  storageBucket: "mounir-40df8.firebasestorage.app",
//  messagingSenderId: "855089551978",
//  appId: "1:855089551978:web:dfd904eb3788d3504e4813",
//  measurementId: "G-M680BM9Y77"
//};

//const app = initializeApp(firebaseConfig);
//export const db = getFirestore(app);

//console.log("✅ Firebase connecté avec succès!");



// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getMessaging, isSupported } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";

export const firebaseConfig = {
  apiKey: "AIzaSyCUcmmnvxjsZoDgQyESi5AvsynnH1kljFc",
  authDomain: "mounir-40df8.firebaseapp.com",
  projectId: "mounir-40df8",
  storageBucket: "mounir-40df8.firebasestorage.app",
  messagingSenderId: "855089551978",
  appId: "1:855089551978:web:dfd904eb3788d3504e4813",
  measurementId: "G-M680BM9Y77"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Messaging instance safely initialized
let messagingInstance = null;
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
  isSupported().then(supported => {
    if (supported) {
      messagingInstance = getMessaging(app);
      console.log("✅ Firebase Messaging prêt!");
    } else {
      console.warn("⚠️ Firebase Messaging non supporté par ce navigateur.");
    }
  }).catch(err => console.error("Erreur vérification Messaging:", err));
}

export const getMessagingInstance = async () => {
  const supported = await isSupported();
  if (supported) {
    return getMessaging(app);
  }
  return null;
};

