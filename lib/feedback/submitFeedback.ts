import { Linking, Platform } from 'react-native';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { awaitFirestoreMutation } from '@/lib/firebase/firestoreConnectivity';
import { isFirestoreReady, requireFirestore } from '@/lib/firebase/config';
import { userFeedbackRef } from '@/lib/firebase/firestorePaths';
import { useAuthStore } from '@/store/useAuthStore';
import { APP_VERSION, SUPPORT_EMAIL } from '@/constants/app';

export type FeedbackCategory = 'suggestion' | 'bug' | 'other';

export type SubmitFeedbackResult =
  | { kind: 'saved' }
  | { kind: 'email_opened' };

/**
 * Saves feedback to Firestore under `users/{uid}/feedback` when the user is signed in with Firebase
 * (not preview mode) and Firestore is available. Otherwise opens the mail app with a pre-filled message
 * to SUPPORT_EMAIL so nothing is lost.
 */
export async function submitFeedback(input: {
  category: FeedbackCategory;
  message: string;
}): Promise<SubmitFeedbackResult> {
  const message = input.message.trim();
  if (message.length < 10) {
    throw new Error('Please write at least 10 characters so we can understand your feedback.');
  }

  const s = useAuthStore.getState();
  const uid = s.user?.uid;
  const canUseCloud =
    Boolean(uid && !s.temporaryDevLogin && isFirestoreReady());

  if (canUseCloud && uid) {
    try {
      const db = requireFirestore();
      const id = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`;
      const ref = doc(userFeedbackRef(db, uid), id);
      await awaitFirestoreMutation(
        setDoc(ref, {
          category: input.category,
          message,
          createdAt: serverTimestamp(),
          appVersion: APP_VERSION,
          platform: Platform.OS,
          userEmail: s.user?.email ?? null,
        })
      );
      return { kind: 'saved' };
    } catch (e) {
      console.warn('[Feedback] Firestore save failed, falling back to email:', e);
    }
  }

  const subject = encodeURIComponent(`ConstructPro feedback (${input.category})`);
  const body = encodeURIComponent(
    `---\nApp v${APP_VERSION} · ${Platform.OS}\nCategory: ${input.category}\n---\n\n${message}`
  );
  const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  await Linking.openURL(url);
  return { kind: 'email_opened' };
}
