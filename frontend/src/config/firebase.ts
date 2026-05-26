// ─────────────────────────────────────────────────────────────
//  src/config/firebase.ts
//
//  ⚠️  REPLACE the placeholder values below with your own
//      Firebase project config from:
//      Firebase Console → Project Settings → Your apps → SDK setup
// ─────────────────────────────────────────────────────────────
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDuAoN4WXflYR1zJmMZ8nNPShI2m8zhDfs",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "keepinmind-dce6e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "keepinmind-dce6e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "keepinmind-dce6e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "329859333999",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:329859333999:web:a721e118de39e3a62ab29a",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-FJ1STMBFL1"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ── Drive scopes ────────────────────────────────────────────
// drive: Full read/write access to Google Drive files.
//   Grants: See, edit, create, and delete all Drive files.
//   This is required for gallery uploads, storage quota, note sync, and thumbnail access.
//
// ⚠️  This is a "restricted" scope. During development, add your email as a
//     Test User in Google Cloud Console → OAuth consent screen to bypass the
//     "Google hasn't verified this app" warning.
googleProvider.addScope('https://www.googleapis.com/auth/drive');

export default app;
