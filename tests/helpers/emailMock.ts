import { EmailService, EmailTemplate } from '../../src/lib/services/emailService';

export interface MockEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  timestamp: Date;
}

export class MockEmailService extends EmailService {
  public sentEmails: MockEmail[] = [];
  public shouldFail: boolean = false;
  public failReason?: string;

  constructor() {
    // Pass empty config to avoid real SMTP connection
    super({
      host: 'localhost',
      port: 587,
      secure: false,
      auth: {
        user: 'test',
        pass: 'test'
      }
    });
  }

  /**
   * Override the sendEmail method to capture emails instead of sending them
   */
  protected async sendEmail(to: string, template: EmailTemplate): Promise<boolean> {
    if (this.shouldFail) {
      throw new Error(this.failReason || 'Mock email service configured to fail');
    }

    const mockEmail: MockEmail = {
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      timestamp: new Date()
    };

    this.sentEmails.push(mockEmail);
    return true;
  }

  /**
   * Override verifyConnection to always return true in tests
   */
  async verifyConnection(): Promise<boolean> {
    return !this.shouldFail;
  }

  /**
   * Get all sent emails
   */
  getSentEmails(): MockEmail[] {
    return [...this.sentEmails];
  }

  /**
   * Get emails sent to a specific address
   */
  getEmailsTo(email: string): MockEmail[] {
    return this.sentEmails.filter(emailObj => emailObj.to === email);
  }

  /**
   * Get the last email sent
   */
  getLastEmail(): MockEmail | undefined {
    return this.sentEmails[this.sentEmails.length - 1];
  }

  /**
   * Clear all sent emails
   */
  clearSentEmails(): void {
    this.sentEmails = [];
  }

  /**
   * Configure the mock to fail
   */
  setShouldFail(shouldFail: boolean, reason?: string): void {
    this.shouldFail = shouldFail;
    this.failReason = reason;
  }

  /**
   * Reset mock state
   */
  reset(): void {
    this.sentEmails = [];
    this.shouldFail = false;
    this.failReason = undefined;
  }
}

// Export singleton mock instance
export const mockEmailService = new MockEmailService(); 