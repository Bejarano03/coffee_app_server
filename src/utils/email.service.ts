import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly inMockMode: boolean;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host) {
      this.inMockMode = true;
      this.logger.warn('SMTP_HOST is not configured. Falling back to JSON transport for local testing.');
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
    } else {
      this.inMockMode = false;
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user && pass ? { user, pass } : undefined,
      });
    }
  }

  async sendTemporaryPasswordEmail(recipient: string, temporaryPassword: string, expiresAt: Date) {
    const fromAddress = process.env.EMAIL_FROM || 'Coffee Club <no-reply@coffeeclub.test>';

    const formattedExpiration = expiresAt.toLocaleString('en-US', { timeZone: 'UTC', hour12: true });

    const mailOptions: nodemailer.SendMailOptions = {
      from: fromAddress,
      to: recipient,
      subject: 'Your temporary Coffee Club password',
      text: `Hello,

We received a request to reset the password for your Coffee Club account.

Temporary Password: ${temporaryPassword}
Expires: ${formattedExpiration} UTC

Use this password to sign in within the time window above. You will be asked to create a new password immediately after logging in.

If you did not request this, you can ignore this email.

– Coffee Club Support`,
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      if (this.inMockMode && result.message) {
        this.logger.debug(`Mock email payload for ${recipient}: ${result.message.toString()}`);
      }
      this.logger.debug(`Temporary password email sent to ${recipient}`);
    } catch (error) {
      this.logger.error(`Failed to send temporary password email: ${error.message}`);
      throw new InternalServerErrorException('Unable to send password reset email.');
    }
  }
}
