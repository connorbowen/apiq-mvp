import { createMocks } from 'node-mocks-http';
import handler from '../../../../pages/api/auth/resend-verification';
import { prisma } from '../../../../lib/database/client';;
import { mockEmailService } from '../../../helpers/emailMock';

describe('/api/auth/resend-verification integration', () => {
  const testEmail = 'integration-test@example.com';
  const testName = 'Integration Test User';

  beforeEach(async () => {
    // Clean up user and emails before each test
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.verificationToken.deleteMany({ where: { email: testEmail } });
    mockEmailService.clearSentEmails();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.verificationToken.deleteMany({ where: { email: testEmail } });
  });

  it('sends a verification email to an unverified user', async () => {
    // Create unverified user
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: testName,
        password: 'hashed-password',
        emailVerified: false,
        isActive: true,
        role: 'USER',
      },
    });

    // Prepare request/response mocks
    const { req, res } = createMocks({
      method: 'POST',
      body: { email: testEmail },
    });

    // Patch EmailService to use the mock
    jest.spyOn(require('../../../../src/lib/services/emailService'), 'EmailService').mockImplementation(() => mockEmailService);

    // Type cast req/res to any for Next.js API compatibility
    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data.message).toMatch(/Verification email sent successfully/);

    // Assert email was sent
    const sentEmails = mockEmailService.getEmailsTo(testEmail);
    expect(sentEmails.length).toBe(1);
    expect(sentEmails[0].subject).toMatch(/verify/i);
    expect(sentEmails[0].html).toContain('/verify?token=');
  });

  it('does not send email if user is already verified', async () => {
    // Create verified user
    await prisma.user.create({
      data: {
        email: testEmail,
        name: testName,
        password: 'hashed-password',
        emailVerified: true,
        isActive: true,
        role: 'USER',
      },
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: { email: testEmail },
    });

    jest.spyOn(require('../../../../src/lib/services/emailService'), 'EmailService').mockImplementation(() => mockEmailService);

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data.message).toMatch(/already verified/i);
    expect(mockEmailService.getEmailsTo(testEmail).length).toBe(0);
  });

  it('does not send email for non-existent user but returns generic message', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { email: testEmail },
    });

    jest.spyOn(require('../../../../src/lib/services/emailService'), 'EmailService').mockImplementation(() => mockEmailService);

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data.message).toMatch(/If an account with this email exists/);
    expect(mockEmailService.getEmailsTo(testEmail).length).toBe(0);
  });
}); 