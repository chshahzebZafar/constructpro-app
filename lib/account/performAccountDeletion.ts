import {
  reauthenticateWithPassword,
  reauthenticateWithGoogleIdToken,
  deleteFirebaseAuthUser,
  getCurrentUserOrThrow,
} from '@/lib/firebase/auth';
import { wipeUserDataBeforeAuthDelete } from '@/lib/account/wipeUserDataBeforeAuthDelete';

/**
 * Re-authenticates, removes user Firestore + local data, then deletes the Firebase Auth account.
 */
export async function performAccountDeletion(opts: {
  password?: string;
  googleIdToken?: string;
}): Promise<void> {
  const user = getCurrentUserOrThrow();
  const uid = user.uid;

  if (opts.password?.trim()) {
    await reauthenticateWithPassword(opts.password);
  } else if (opts.googleIdToken) {
    await reauthenticateWithGoogleIdToken(opts.googleIdToken);
  } else {
    throw new Error('Confirm with your password or Google to continue.');
  }

  await wipeUserDataBeforeAuthDelete(uid);
  await deleteFirebaseAuthUser();
}
