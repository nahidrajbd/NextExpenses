import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Public web client Firebase configuration with safe defaults for production hosting
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA926TazojEqTwUnUU8_fosdRJQyyjVYgo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "nextexpenses-87338.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "nextexpenses-87338",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "nextexpenses-87338.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "37525208060",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:37525208060:web:3b895f45c4afe63c1a1079"
};

// Initialize Firebase (safely reuse existing instance if already initialized)
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
