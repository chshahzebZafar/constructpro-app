import type { FirebaseApp } from 'firebase/app';
import type { Auth, Persistence } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** RN bundle exports this; web `firebase/auth` typings omit it. */
type FirebaseAuthModule = typeof import('firebase/auth') & {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

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

type FirebaseInstances = {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  storage: FirebaseStorage | null;
};

function initFirebase(): FirebaseInstances {
  if (!isFirebaseConfigured()) {
    return { app: null, auth: null, db: null, storage: null };
  }
  try {
    const { initializeApp, getApps, getApp } = require('firebase/app') as typeof import('firebase/app');
    const { getAuth, initializeAuth, getReactNativePersistence } = require('firebase/auth') as FirebaseAuthModule;
    const { getFirestore } = require('firebase/firestore') as typeof import('firebase/firestore');
    const { getStorage } = require('firebase/storage') as typeof import('firebase/storage');

    const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

    /** On native, default getAuth() is in-memory only — sessions vanish after kill. AsyncStorage keeps users signed in. */
    let auth: Auth | null;
    if (Platform.OS === 'web') {
      auth = getAuth(app);
    } else {
      try {
        auth = initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
      } catch {
        auth = getAuth(app);
      }
    }

    return {
      app,
      auth,
      db: getFirestore(app),
      storage: getStorage(app),
    };
  } catch (e) {
    console.warn('[Firebase] Initialization failed (check .env):', e);
    return { app: null, auth: null, db: null, storage: null };
  }
}

/** Lazy so release builds do not load any firebase/* package until something needs it. */
let cached: FirebaseInstances | null = null;

function ensureFirebase(): FirebaseInstances {
  if (cached === null) {
    cached = initFirebase();
  }
  return cached;
}

export function getFirebaseApp(): FirebaseApp | null {
  return ensureFirebase().app;
}

export function getAuth(): Auth | null {
  return ensureFirebase().auth;
}

export function getDb(): Firestore | null {
  return ensureFirebase().db;
}

export function getStorageInstance(): FirebaseStorage | null {
  return ensureFirebase().storage;
}

/** True when Firebase Auth is usable (env set and init did not throw). */
export function isFirebaseReady(): boolean {
  return getAuth() !== null;
}

/** Firestore is available (same conditions as auth). */
export function isFirestoreReady(): boolean {
  return getDb() !== null;
}

export function isStorageReady(): boolean {
  return getStorageInstance() !== null;
}

export default getFirebaseApp;
