import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '../../src/generated/prisma';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, name, company, role, source, interests } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if email already exists
    const existingEntry = await prisma.waitlist.findUnique({
      where: { email }
    });

    if (existingEntry) {
      return res.status(409).json({ 
        error: 'Email already registered',
        message: 'You\'re already on our waitlist! We\'ll be in touch soon.'
      });
    }

    // Create waitlist entry
    const waitlistEntry = await prisma.waitlist.create({
      data: {
        email,
        name: name || null,
        company: company || null,
        role: role || null,
        source: source || 'landing_page',
        interests: interests || [],
        status: 'pending'
      }
    });

    // Log the signup for analytics
    console.log(`New waitlist signup: ${email} from ${company || 'Unknown Company'}`);

    return res.status(201).json({
      success: true,
      message: 'Successfully added to waitlist!',
      data: {
        id: waitlistEntry.id,
        email: waitlistEntry.email,
        status: waitlistEntry.status
      }
    });

  } catch (error) {
    console.error('Waitlist signup error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Something went wrong. Please try again later.'
    });
  } finally {
    await prisma.$disconnect();
  }
}
