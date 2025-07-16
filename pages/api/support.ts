import { NextApiRequest, NextApiResponse } from 'next';
import { sendSupportEmail } from '../../src/lib/services/emailService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name, message } = req.body;

  if (!email || !name || !message || typeof email !== 'string' || typeof name !== 'string' || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid fields' });
  }

  try {
    await sendSupportEmail({
      to: 'apiq-testing@gmail.com',
      from: email,
      subject: `Support Request from ${name}`,
      text: `User: ${name} <${email}>

Message:
${message}`,
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Support email error:', error);
    return res.status(500).json({ error: 'Failed to send support email' });
  }
} 