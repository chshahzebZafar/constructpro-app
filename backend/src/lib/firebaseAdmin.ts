import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

function initFirebase(): void {
  if (admin.apps.length) return;

  // 1. Auto-detect service account JSON in the backend root (local dev)
  const keyFileEnv = process.env.FIREBASE_KEY_FILE;
  const autoDetectPath = path.resolve(__dirname, '../../constructpro-ee587-firebase-adminsdk-fbsvc-04b978f75c.json');

  const keyFilePath = keyFileEnv
    ? path.resolve(keyFileEnv)
    : fs.existsSync(autoDetectPath)
    ? autoDetectPath
    : null;

  if (keyFilePath && fs.existsSync(keyFilePath)) {
    console.log(`[firebase] Loading credentials from: ${path.basename(keyFilePath)}`);
    const serviceAccount = JSON.parse(fs.readFileSync(keyFilePath, 'utf-8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    return;
  }

  // 2. Fall back to individual env vars (Render / production)
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY ?? '';
  const privateKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase credentials not found. Place the service account JSON in backend/ ' +
      'or set FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.'
    );
  }

  console.log('[firebase] Loading credentials from environment variables.');
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

initFirebase();

export const firebaseAuth = admin.auth();
