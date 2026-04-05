export function mapFirebaseAuthError(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
      return 'No account found with this email';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password';
    case 'auth/email-already-in-use':
      return 'This email is already registered';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters';
    case 'auth/network-request-failed':
      return 'No internet connection';
    case 'auth/invalid-email':
      return 'Enter a valid email address';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is turned off. In Firebase Console → Authentication → Sign-in method, enable Email/Password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again in a few minutes.';
    case 'auth/requires-recent-login':
      return 'Please sign in again, then retry account deletion.';
    case 'auth/invalid-api-key':
      return 'Invalid Firebase configuration. Check EXPO_PUBLIC_FIREBASE_API_KEY in .env matches your Firebase project.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
