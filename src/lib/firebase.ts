import { initializeApp } from "firebase/app";
import { getFirestore, setLogLevel } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import firebaseConfigData from "../../firebase-applet-config.json";

// Suppress transient backend unreachable log noise when running client-side with fallback
setLogLevel("silent");

export const firebaseConfig = firebaseConfigData;

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firestore with specified database ID
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// ---------------------------------------------------------------------------
// Firebase Auth (anonymous session).
//
// This app has its own in-app login (LoginPortal) that is completely separate
// from Firebase Auth — it checks credentials against the "users" Firestore
// collection directly, so `request.auth` was always null on every Firestore
// call. That made it impossible for security rules to require anything
// beyond `if true`, since there was no signed-in principal to check.
//
// Signing in anonymously here gives every real app session a Firebase Auth
// identity, so Firestore rules can require `request.auth != null` for all
// reads/writes. This blocks raw/unauthenticated access (e.g. a script hitting
// the REST API directly with just the public API key and never touching the
// SDK's auth flow). It does NOT, by itself, stop someone who deliberately
// loads the Firebase SDK with this same public config and calls
// signInAnonymously() themselves — anonymous sign-in is intentionally open to
// anyone by design. Closing that last gap requires either real per-user
// Firebase Auth tied to roles, or Firebase App Check (reCAPTCHA-backed),
// neither of which can be wired up remotely without console access.
// ---------------------------------------------------------------------------
export const auth = getAuth(app);

export const authReady: Promise<void> = new Promise((resolve) => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      unsubscribe();
      resolve();
    }
  });

  signInAnonymously(auth).catch((err) => {
    console.warn("[Firebase Auth] Anonymous sign-in failed — Firestore reads/writes will be denied by security rules until this succeeds.", err);
  });
});
