import type { Auth, User } from 'firebase/auth';
import { auth } from './config';

/** Lazy firebase/auth so release builds without EAS env never load the auth bundle at startup. */
function authSdk() {
  return require('firebase/auth') as typeof import('firebase/auth');
}

function requireAuth(): Auth {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized. Configure EXPO_PUBLIC_FIREBASE_* in .env');
  }
  return auth;
}

export const registerUser = (email: string, password: string) => {
  const { createUserWithEmailAndPassword } = authSdk();
  return createUserWithEmailAndPassword(requireAuth(), email, password);
};

export const loginUser = (email: string, password: string) => {
  const { signInWithEmailAndPassword } = authSdk();
  return signInWithEmailAndPassword(requireAuth(), email, password);
};

export const logoutUser = () => {
  const { signOut } = authSdk();
  return signOut(requireAuth());
};

export const resetPassword = (email: string) => {
  const { sendPasswordResetEmail } = authSdk();
  return sendPasswordResetEmail(requireAuth(), email);
};

export const listenToAuth = (callback: (user: User | null) => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  const { onAuthStateChanged } = authSdk();
  return onAuthStateChanged(auth, callback);
};

export async function signInWithGoogleIdToken(idToken: string) {
  const { GoogleAuthProvider, signInWithCredential } = authSdk();
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
  const { EmailAuthProvider, reauthenticateWithCredential } = authSdk();
  const a = requireAuth();
  const user = a.currentUser;
  if (!user?.email) {
    throw new Error('This account has no email/password sign-in.');
  }
  const cred = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, cred);
}

export async function reauthenticateWithGoogleIdToken(idToken: string): Promise<void> {
  const { GoogleAuthProvider, reauthenticateWithCredential } = authSdk();
  const a = requireAuth();
  const user = a.currentUser;
  if (!user) throw new Error('Not signed in.');
  const cred = GoogleAuthProvider.credential(idToken);
  await reauthenticateWithCredential(user, cred);
}

export async function deleteFirebaseAuthUser(): Promise<void> {
  const { deleteUser } = authSdk();
  const a = requireAuth();
  const user = a.currentUser;
  if (!user) throw new Error('Not signed in.');
  await deleteUser(user);
}
