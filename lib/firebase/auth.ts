import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  EmailAuthProvider,
  signInWithCredential,
  reauthenticateWithCredential,
  deleteUser,
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

export function getCurrentUserOrThrow(): User {
  const u = requireAuth().currentUser;
  if (!u) throw new Error('Not signed in.');
  return u;
}

/** Required before `deleteUser` if the session is stale. */
export async function reauthenticateWithPassword(password: string): Promise<void> {
  const auth = requireAuth();
  const user = auth.currentUser;
  if (!user?.email) {
    throw new Error('This account has no email/password sign-in.');
  }
  const cred = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, cred);
}

export async function reauthenticateWithGoogleIdToken(idToken: string): Promise<void> {
  const auth = requireAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in.');
  const cred = GoogleAuthProvider.credential(idToken);
  await reauthenticateWithCredential(user, cred);
}

export async function deleteFirebaseAuthUser(): Promise<void> {
  const auth = requireAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in.');
  await deleteUser(user);
}
