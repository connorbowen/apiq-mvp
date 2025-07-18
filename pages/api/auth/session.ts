import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../src/lib/auth/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await requireAuth(req, res);
    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(401).json({ success: false, error: (error as Error).message });
  }
} 