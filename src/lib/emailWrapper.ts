import * as nodemailer from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailClient {
  sendMail: (options: nodemailer.SendMailOptions) => Promise<nodemailer.SentMessageInfo>;
  verify: () => Promise<boolean>;
}

/**
 * Create and configure a nodemailer client
 * 
 * @param config - Configuration options for the email service
 * @returns Configured email client instance
 */
export const getEmailClient = (config: EmailConfig): EmailClient => {
  // Validate configuration
  if (!config.host) {
    throw new Error('SMTP host is required for email client');
  }
  if (!config.auth?.user || !config.auth?.pass) {
    throw new Error('SMTP authentication credentials are required');
  }

  // Create the nodemailer transporter
  const transporter = nodemailer.createTransport(config);

  // Return a typed interface
  return {
    sendMail: async (options: nodemailer.SendMailOptions) => {
      return await transporter.sendMail(options);
    },
    verify: async () => {
      return await transporter.verify();
    },
  };
};

/**
 * Create an email client with default configuration from environment variables
 * 
 * @returns Configured email client instance
 */
export const getDefaultEmailClient = (): EmailClient => {
  const config: EmailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  };

  return getEmailClient(config);
};

/**
 * Validate email configuration
 * 
 * @param config - Configuration to validate
 * @returns true if valid, false otherwise
 */
export const validateEmailConfig = (config: EmailConfig): boolean => {
  return !!(
    config.host && 
    config.auth?.user && 
    config.auth?.pass
  );
};

// Export the default client for convenience
export default getDefaultEmailClient; 