import type { Request, Response, NextFunction } from 'express';
import { firebaseAuth } from '../lib/firebaseAdmin';

export interface AuthRequest extends Request {
  uid: string;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header.' });
    return;
  }
  const token = header.slice(7);

  // Dev-only bypass: use "Bearer dev-test" to skip Firebase verification
  if (process.env.NODE_ENV !== 'production' && token === 'dev-test') {
    (req as AuthRequest).uid = 'dev-test-uid';
    next();
    return;
  }

  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    (req as AuthRequest).uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}
