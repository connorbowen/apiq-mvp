import * as nodemailer from 'nodemailer';
import { logInfo, logError } from '../../utils/logger';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private transporter!: nodemailer.Transporter;
  private isTestMode: boolean;
  private isMockMode: boolean = false;
  private consecutiveFailures: number = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 3;

  constructor(config?: EmailConfig) {
    // Check if explicitly disabled for testing
    this.isTestMode = process.env.DISABLE_EMAIL_SENDING === 'true';
    
    if (this.isTestMode) {
      this.setupMockTransporter();
    } else {
      this.setupRealTransporter(config);
    }
  }

  private setupMockTransporter() {
    this.isMockMode = true;
    this.transporter = {
      sendMail: async (mailOptions: any) => {
        // Log the email for testing purposes
        console.log('MOCK EMAIL SENT:', {
          to: mailOptions.to,
          subject: mailOptions.subject,
          html: mailOptions.html?.substring(0, 100) + '...',
          text: mailOptions.text?.substring(0, 100) + '...'
        });
        return { messageId: 'mock-message-id' };
      },
      verify: async () => true
    } as any;
  }

  private setupRealTransporter(config?: EmailConfig) {
    this.isMockMode = false;
    // Use provided config or environment variables
    const emailConfig = config || {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    };

    this.transporter = nodemailer.createTransport(emailConfig);
  }

  /**
   * Switch to mock mode when Gmail limits are hit
   */
  private switchToMockMode(reason: string) {
    if (!this.isMockMode) {
      console.log(`🔄 EMAIL SERVICE: Switching to mock mode - ${reason}`);
      this.isMockMode = true;
      this.setupMockTransporter();
    }
  }

  /**
   * Check if error indicates Gmail daily limit
   */
  private isGmailLimitError(error: any): boolean {
    const errorMessage = error.message || error.toString();
    return (
      errorMessage.includes('Daily sending quota') ||
      errorMessage.includes('quota exceeded') ||
      errorMessage.includes('550 5.4.5') ||
      errorMessage.includes('Daily user sending quota') ||
      errorMessage.includes('User rate limit exceeded')
    );
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(email: string, token: string, name?: string): Promise<boolean> {
    const verificationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/verify?token=${token}`;
    
    const template: EmailTemplate = {
      subject: 'Verify your APIQ account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to APIQ!</h2>
          <p>Hi ${name || 'there'},</p>
          <p>Thanks for signing up for APIQ. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #6b7280;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account with APIQ, you can safely ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            APIQ - Multi-API Orchestrator<br>
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}" style="color: #2563eb;">Visit our website</a>
          </p>
        </div>
      `,
      text: `
Welcome to APIQ!

Hi ${name || 'there'},

Thanks for signing up for APIQ. Please verify your email address by visiting this link:

${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account with APIQ, you can safely ignore this email.

---
APIQ - Multi-API Orchestrator
${process.env.NEXTAUTH_URL || 'http://localhost:3000'}
      `
    };

    return this.sendEmail(email, template);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, token: string, name?: string): Promise<boolean> {
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    
    const template: EmailTemplate = {
      subject: 'Reset your APIQ password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Password Reset Request</h2>
          <p>Hi ${name || 'there'},</p>
          <p>We received a request to reset your password for your APIQ account. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            APIQ - Multi-API Orchestrator<br>
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}" style="color: #2563eb;">Visit our website</a>
          </p>
        </div>
      `,
      text: `
Password Reset Request

Hi ${name || 'there'},

We received a request to reset your password for your APIQ account. Visit this link to create a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

---
APIQ - Multi-API Orchestrator
${process.env.NEXTAUTH_URL || 'http://localhost:3000'}
      `
    };

    return this.sendEmail(email, template);
  }

  /**
   * Send a generic email with automatic fallback to mock mode
   */
  protected async sendEmail(to: string, template: EmailTemplate): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@apiq.com',
        to,
        subject: template.subject,
        html: template.html,
        text: template.text
      };

      await this.transporter.sendMail(mailOptions);
      
      // Reset failure counter on success
      this.consecutiveFailures = 0;
      
      logInfo('Email sent successfully', {
        to,
        subject: template.subject,
        type: template.subject.includes('Verify') ? 'verification' : 'password_reset',
        mode: this.isMockMode ? 'mock' : 'real'
      });

      return true;
    } catch (error) {
      this.consecutiveFailures++;
      
      // Check if this is a Gmail limit error
      if (this.isGmailLimitError(error)) {
        this.switchToMockMode('Gmail daily limit exceeded');
        // Retry with mock mode
        return this.sendEmail(to, template);
      }
      
      // If we've had too many consecutive failures, switch to mock mode
      if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES && !this.isMockMode) {
        this.switchToMockMode(`Too many consecutive failures (${this.consecutiveFailures})`);
        // Retry with mock mode
        return this.sendEmail(to, template);
      }
      
      logError('Failed to send email', error as Error, {
        to,
        subject: template.subject,
        consecutiveFailures: this.consecutiveFailures,
        mode: this.isMockMode ? 'mock' : 'real'
      });
      
      return false;
    }
  }

  /**
   * Verify email configuration
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logInfo('Email service connection verified');
      return true;
    } catch (error) {
      logError('Email service connection failed', error as Error);
      return false;
    }
  }

  /**
   * Send a support email (public)
   */
  async sendSupportEmail(to: string, subject: string, text: string): Promise<boolean> {
    const template = {
      subject,
      html: `<pre>${text}</pre>`,
      text,
    };
    return this.sendEmail(to, template);
  }

  /**
   * Get current email service status
   */
  getStatus() {
    return {
      isTestMode: this.isTestMode,
      isMockMode: this.isMockMode,
      consecutiveFailures: this.consecutiveFailures,
      mode: this.isMockMode ? 'mock' : 'real'
    };
  }
}

export const emailService = new EmailService();

export async function sendSupportEmail({ to, from, subject, text }: { to: string; from: string; subject: string; text: string; }) {
  return emailService.sendSupportEmail(to, subject, text);
} 