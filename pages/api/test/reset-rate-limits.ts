import { NextApiRequest, NextApiResponse } from 'next';
import { memoryRateLimitStore } from '../../../src/middleware/rateLimiter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV !== 'test') {
    return res.status(404).json({ error: 'Not found' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await memoryRateLimitStore.resetAll();
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset rate limits' });
  }
} 