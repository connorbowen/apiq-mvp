// Mock the email service module
jest.mock('./src/lib/services/emailService', () => {
  class MockEmailService {
    sentEmails: { to: string; subject: string; html: string; text: string }[] = [];
    shouldFail = false;
    failReason: string | undefined = undefined;
    async sendVerificationEmail(email: string, token: string, name?: string) {
      const subject = 'Verify your APIQ account';
      const html = `<a>${token}</a>`;
      const text = token;
      this.sentEmails.push({ to: email, subject, html, text });
      return true;
    }
    async sendPasswordResetEmail(email: string, token: string, name?: string) {
      const subject = 'Reset your APIQ password';
      const html = `<a>${token}</a>`;
      const text = token;
      this.sentEmails.push({ to: email, subject, html, text });
      return true;
    }
    async verifyConnection() { return true; }
    getEmailsTo(email: string) { return this.sentEmails.filter((e) => e.to === email); }
    getLastEmail() { return this.sentEmails[this.sentEmails.length - 1]; }
    clearSentEmails() { this.sentEmails = []; }
    setShouldFail(shouldFail: boolean, reason?: string) { this.shouldFail = shouldFail; this.failReason = reason; }
    reset() { this.sentEmails = []; this.shouldFail = false; this.failReason = undefined; }
  }
  const mockEmailService = new MockEmailService();
  return {
    EmailService: jest.fn().mockImplementation(() => mockEmailService),
    emailService: mockEmailService
  };
});

// Reset mock before each test
beforeEach(() => {
  const { emailService } = require('./src/lib/services/emailService');
  emailService.reset();
}); 