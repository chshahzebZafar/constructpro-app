import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const projectIdEnv = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: projectIdEnv,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  ...(projectIdEnv
    ? {
        storageBucket:
          process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectIdEnv}.appspot.com`,
      }
    : {}),
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId
  );
}

function initFirebase(): {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  storage: FirebaseStorage | null;
} {
  if (!isFirebaseConfigured()) {
    return { app: null, auth: null, db: null, storage: null };
  }
  try {
    const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    return {
      app,
      auth: getAuth(app),
      db: getFirestore(app),
      storage: getStorage(app),
    };
  } catch (e) {
    console.warn('[Firebase] Initialization failed (check .env):', e);
    return { app: null, auth: null, db: null, storage: null };
  }
}

const { app: firebaseApp, auth: firebaseAuth, db: firebaseDb, storage: firebaseStorage } = initFirebase();

export const auth: Auth | null = firebaseAuth;

/** Firestore instance when Firebase is configured; otherwise null. */
export const db: Firestore | null = firebaseDb;

/** Firebase Storage when Firebase is configured; otherwise null. */
export const storage: FirebaseStorage | null = firebaseStorage;

/** True when Firebase Auth is usable (env set and init did not throw). */
export function isFirebaseReady(): boolean {
  return firebaseAuth !== null;
}

/** Firestore is available (same conditions as auth). */
export function isFirestoreReady(): boolean {
  return firebaseDb !== null;
}

export function isStorageReady(): boolean {
  return firebaseStorage !== null;
}

export default firebaseApp;
