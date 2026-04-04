import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithCredential,
  Auth,
} from 'firebase/auth';
import { auth } from './config';

function requireAuth(): Auth {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized. Configure EXPO_PUBLIC_FIREBASE_* in .env');
  }
  return auth;
}

export const registerUser = (email: string, password: string) =>
  createUserWithEmailAndPassword(requireAuth(), email, password);

export const loginUser = (email: string, password: string) =>
  signInWithEmailAndPassword(requireAuth(), email, password);

export const logoutUser = () => signOut(requireAuth());

export const resetPassword = (email: string) => sendPasswordResetEmail(requireAuth(), email);

export const listenToAuth = (callback: (user: User | null) => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

export async function signInWithGoogleIdToken(idToken: string) {
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(requireAuth(), credential);
}
