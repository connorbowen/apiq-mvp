import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../src/lib/auth/session';
import { prisma } from '../../../lib/database/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Require authentication
    const user = await requireAuth(req, res);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      // Try to find existing tour state for this user
      let tourState = await prisma.tourState.findUnique({
        where: { userId: user.id }
      });

      if (!tourState) {
        // Create a new tour state for new users
        tourState = await prisma.tourState.create({
          data: {
            userId: user.id,
            currentStep: 0,
            totalSteps: 3,
            isActive: true,
            completedSteps: [],
            dismissed: false,
            lastShown: new Date(),
          }
        });
      }

      return res.status(200).json({ success: true, data: tourState });
    }

    if (req.method === 'PUT') {
      const { currentStep, isActive, completedSteps, dismissed } = req.body;

      // Update or create tour state
      const tourState = await prisma.tourState.upsert({
        where: { userId: user.id },
        update: {
          currentStep: currentStep ?? undefined,
          isActive: isActive ?? undefined,
          completedSteps: completedSteps ?? undefined,
          dismissed: dismissed ?? undefined,
          lastShown: new Date(),
        },
        create: {
          userId: user.id,
          currentStep: currentStep ?? 0,
          totalSteps: 3,
          isActive: isActive ?? true,
          completedSteps: completedSteps ?? [],
          dismissed: dismissed ?? false,
          lastShown: new Date(),
        }
      });

      return res.status(200).json({ success: true, data: tourState });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Tour state error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
} 