import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { User } from '@/entities/user.entity';
import { MessageKeys } from '@/common/message-keys';
import { Language } from '@/common/enums';
import { I18nService } from '@/i18n/i18n.service';

/**
 * Email Service
 * Handles email sending functionality for user registration and verification
 * Implements ? email confirmation requirements
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private configService: ConfigService,
    private i18nService: I18nService,
  ) {
    this.initializeTransporter();
  }

  /**
   * Get translation for a specific key and language
   */
  private getTranslation(key: string, language: string): string {
    // Create a proper Accept-Language header format
    const acceptLanguageHeader = `${language},en;q=0.9`;
    return this.i18nService.translate(key, acceptLanguageHeader).message;
  }

  /**
   * Map Language enum values to frontend language codes
   */
  private getLanguageCode(language: string): string {
    switch (language) {
      case Language.PERSIAN:
        return 'fa';
      case Language.ARABIC:
        return 'ar';
      default:
        return 'fa'; // Default to Persian
    }
  }

  /**
   * Initialize nodemailer transporter with SMTP configuration
   */
  private initializeTransporter(): void {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: parseInt(this.configService.get('SMTP_PORT') || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  /**
   * Send email verification email to newly registered user
   * Implements step 12 from ? main flow
   */
  async sendVerificationEmail(
    user: User,
    verificationToken: string,
  ): Promise<void> {
    try {
      const frontendUrl = this.configService.get('FRONTEND_URL');

      // Get language code
      const languageCode = user.tenant?.language
        ? this.getLanguageCode(user.tenant.language)
        : 'fa';
      const verificationUrl = `${frontendUrl}/auth/verify-email?token=${verificationToken}&lang=${languageCode}`;

      // Get localized email content
      const subject = this.getTranslation(
        MessageKeys.EMAIL_VERIFICATION_SUBJECT,
        languageCode,
      );
      const emailContent = this.buildVerificationEmailTemplate(
        user.fullName,
        verificationUrl,
        languageCode,
      );

      const mailOptions = {
        from: this.configService.get('FROM_EMAIL'),
        to: user.email,
        subject,
        html: emailContent,
      };

      await this.transporter.sendMail(mailOptions);

      this.logger.log(`Verification email sent successfully to ${user.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${user.email}`,
        error,
      );
      throw new Error(MessageKeys.EMAIL_SERVICE_ERROR);
    }
  }

  /**
   * Build HTML template for verification email
   */
  private buildVerificationEmailTemplate(
    fullName: string,
    verificationUrl: string,
    language: string,
  ): string {
    // Get all localized strings
    const welcome = this.getTranslation(
      MessageKeys.EMAIL_VERIFICATION_WELCOME,
      language,
    );
    const hello = this.getTranslation(
      MessageKeys.EMAIL_VERIFICATION_HELLO,
      language,
    ).replace('{name}', fullName);
    const thankYou = this.getTranslation(
      MessageKeys.EMAIL_VERIFICATION_THANK_YOU,
      language,
    );
    const buttonText = this.getTranslation(
      MessageKeys.EMAIL_VERIFICATION_BUTTON_TEXT,
      language,
    );
    const alternativeText = this.getTranslation(
      MessageKeys.EMAIL_VERIFICATION_ALTERNATIVE_TEXT,
      language,
    );
    const expiryNote = this.getTranslation(
      MessageKeys.EMAIL_VERIFICATION_EXPIRY_NOTE,
      language,
    );
    const ignoreNote = this.getTranslation(
      MessageKeys.EMAIL_VERIFICATION_IGNORE_NOTE,
      language,
    );
    const footer = this.getTranslation(
      MessageKeys.EMAIL_VERIFICATION_FOOTER,
      language,
    );

    // Determine if RTL is needed
    const isRTL = language === 'fa' || language === 'ar';
    const dirAttribute = isRTL ? 'dir="rtl"' : 'dir="ltr"';
    const textAlign = isRTL ? 'text-align: right;' : 'text-align: left;';
    const fontFamily = isRTL
      ? 'font-family: "Segoe UI", Tahoma, Arial, sans-serif;'
      : 'font-family: Arial, sans-serif;';

    return `
      <!DOCTYPE html>
      <html ${dirAttribute}>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            ${fontFamily} 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            ${textAlign}
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            ${dirAttribute.includes('rtl') ? 'direction: rtl;' : 'direction: ltr;'}
          }
          .header { 
            background-color: #007bff; 
            color: white; 
            padding: 20px; 
            text-align: center; 
            border-radius: 8px 8px 0 0;
          }
          .content { 
            padding: 20px; 
            background-color: #f9f9f9; 
            ${textAlign}
          }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #28a745; 
            color: white; 
            text-decoration: none; 
            border-radius: 4px; 
            margin: 20px 0;
            ${isRTL ? 'margin-right: 0;' : 'margin-left: 0;'}
          }
          .footer { 
            padding: 20px; 
            text-align: center; 
            font-size: 12px; 
            color: #666; 
            background-color: #f8f9fa;
            border-radius: 0 0 8px 8px;
          }
          .url-text {
            word-break: break-all;
            ${isRTL ? 'direction: ltr; text-align: left;' : ''}
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${welcome}</h1>
          </div>
          <div class="content">
            <h2>${hello}</h2>
            <p>${thankYou}</p>
            <a href="${verificationUrl}" class="button">${buttonText}</a>
            <p>${alternativeText}</p>
            <p class="url-text">${verificationUrl}</p>
            <p>${expiryNote}</p>
            <p>${ignoreNote}</p>
          </div>
          <div class="footer">
            <p>${footer}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate secure verification token
   */
  generateVerificationToken(): string {
    return uuidv4().replace(/-/g, '');
  }

  /**
   * Send password reset email to user
   * Implements ? - Password Reset Request
   */
  async sendPasswordResetEmail(user: User, resetToken: string): Promise<void> {
    try {
      const frontendUrl = this.configService.get('FRONTEND_URL');

      // Get language code
      const languageCode = user.tenant?.language
        ? this.getLanguageCode(user.tenant.language)
        : 'fa';
      const resetUrl = `${frontendUrl}/auth/reset-password?token=${resetToken}&lang=${languageCode}`;

      // Get localized email content
      const subject = this.getTranslation(
        MessageKeys.EMAIL_RESET_SUBJECT,
        languageCode,
      );
      const emailContent = this.generatePasswordResetEmailTemplate(
        user.fullName,
        resetUrl,
        languageCode,
      );

      const mailOptions = {
        from: this.configService.get('FROM_EMAIL'),
        to: user.email,
        subject,
        html: emailContent,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${user.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${user.email}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Generate password reset email HTML template
   */
  private generatePasswordResetEmailTemplate(
    fullName: string,
    resetUrl: string,
    language: string,
  ): string {
    // Get all localized strings
    const header = this.getTranslation(
      MessageKeys.EMAIL_RESET_HEADER,
      language,
    );
    const hello = this.getTranslation(
      MessageKeys.EMAIL_RESET_HELLO,
      language,
    ).replace('{name}', fullName);
    const description = this.getTranslation(
      MessageKeys.EMAIL_RESET_DESCRIPTION,
      language,
    );
    const buttonText = this.getTranslation(
      MessageKeys.EMAIL_RESET_BUTTON_TEXT,
      language,
    );
    const alternativeText = this.getTranslation(
      MessageKeys.EMAIL_RESET_ALTERNATIVE_TEXT,
      language,
    );
    const importantTitle = this.getTranslation(
      MessageKeys.EMAIL_RESET_IMPORTANT_TITLE,
      language,
    );
    const expiryNote = this.getTranslation(
      MessageKeys.EMAIL_RESET_EXPIRY_NOTE,
      language,
    );
    const singleUseNote = this.getTranslation(
      MessageKeys.EMAIL_RESET_SINGLE_USE_NOTE,
      language,
    );
    const ignoreNote = this.getTranslation(
      MessageKeys.EMAIL_RESET_IGNORE_NOTE,
      language,
    );
    const securityTitle = this.getTranslation(
      MessageKeys.EMAIL_RESET_SECURITY_TITLE,
      language,
    );
    const securityLength = this.getTranslation(
      MessageKeys.EMAIL_RESET_SECURITY_LENGTH,
      language,
    );
    const securityMixedCase = this.getTranslation(
      MessageKeys.EMAIL_RESET_SECURITY_MIXED_CASE,
      language,
    );
    const securityNumbers = this.getTranslation(
      MessageKeys.EMAIL_RESET_SECURITY_NUMBERS,
      language,
    );
    const footer = this.getTranslation(
      MessageKeys.EMAIL_RESET_FOOTER,
      language,
    );
    const supportNote = this.getTranslation(
      MessageKeys.EMAIL_RESET_SUPPORT_NOTE,
      language,
    );

    // Determine if RTL is needed
    const isRTL = language === 'fa' || language === 'ar';
    const dirAttribute = isRTL ? 'dir="rtl"' : 'dir="ltr"';
    const textAlign = isRTL ? 'text-align: right;' : 'text-align: left;';
    const fontFamily = isRTL
      ? 'font-family: "Segoe UI", Tahoma, Arial, sans-serif;'
      : 'font-family: Arial, sans-serif;';

    return `
      <!DOCTYPE html>
      <html ${dirAttribute}>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${header}</title>
        <style>
          body { 
            ${fontFamily} 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            ${textAlign}
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            ${dirAttribute.includes('rtl') ? 'direction: rtl;' : 'direction: ltr;'}
          }
          .header { 
            background: #007bff; 
            color: white; 
            padding: 20px; 
            text-align: center; 
            border-radius: 8px 8px 0 0;
          }
          .content { 
            padding: 20px; 
            background: #f9f9f9; 
            ${textAlign}
          }
          .button { 
            background: #28a745; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 5px; 
            display: inline-block; 
            margin: 20px 0;
            ${isRTL ? 'margin-right: 0;' : 'margin-left: 0;'}
          }
          .footer { 
            text-align: center; 
            padding: 20px; 
            font-size: 12px; 
            color: #666; 
            background-color: #f8f9fa;
            border-radius: 0 0 8px 8px;
          }
          .warning { 
            background: #fff3cd; 
            border-${isRTL ? 'right' : 'left'}: 4px solid #ffc107; 
            padding: 12px; 
            margin: 20px 0;
            ${textAlign}
          }
          .url-text {
            word-break: break-all;
            ${isRTL ? 'direction: ltr; text-align: left;' : ''}
          }
          ul {
            ${isRTL ? 'padding-right: 20px; padding-left: 0;' : 'padding-left: 20px; padding-right: 0;'}
          }
          li {
            margin: 8px 0;
            ${textAlign}
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${header}</h1>
          </div>
          <div class="content">
            <h2>${hello}</h2>
            <p>${description}</p>
            <a href="${resetUrl}" class="button">${buttonText}</a>
            <p>${alternativeText}</p>
            <p class="url-text">${resetUrl}</p>
            <div class="warning">
              <strong>${importantTitle}</strong>
              <ul>
                <li>${expiryNote}</li>
                <li>${singleUseNote}</li>
                <li>${ignoreNote}</li>
              </ul>
            </div>
            <p>${securityTitle}</p>
            <ul>
              <li>${securityLength}</li>
              <li>${securityMixedCase}</li>
              <li>${securityNumbers}</li>
            </ul>
          </div>
          <div class="footer">
            <p>${footer}</p>
            <p>${supportNote}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Check if email service is available
   */
  async isEmailServiceAvailable(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.warn('Email service is not available', error);
      return false;
    }
  }

  /**
   * Send welcome email to newly created user with login credentials
   * Implements ? welcome email requirements
   */
  async sendWelcomeEmail(
    email: string,
    _subject: string, // Unused - we generate subject internally
    emailData: {
      name: string;
      email: string;
      password: string;
      loginUrl: string;
      companyName: string;
    },
    language: string,
  ): Promise<void> {
    try {
      const subject = this.getTranslation(
        MessageKeys.EMAIL_WELCOME_SUBJECT,
        language,
      );
      const emailContent = this.buildWelcomeEmailTemplate(emailData, language);

      const mailOptions = {
        from: this.configService.get('FROM_EMAIL'),
        to: email,
        subject,
        html: emailContent,
      };

      await this.transporter.sendMail(mailOptions);

      this.logger.log(`Welcome email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}`, error);
      throw new Error(MessageKeys.EMAIL_SERVICE_ERROR);
    }
  }

  /**
   * Build HTML template for welcome email
   */
  private buildWelcomeEmailTemplate(
    data: {
      name: string;
      email: string;
      password: string;
      loginUrl: string;
      companyName: string;
    },
    language: string,
  ): string {
    // Get all localized strings
    const header = this.getTranslation(
      MessageKeys.EMAIL_WELCOME_HEADER,
      language,
    );
    const hello = this.getTranslation(
      MessageKeys.EMAIL_WELCOME_HELLO,
      language,
    ).replace('{name}', data.name);
    const accountCreated = this.getTranslation(
      MessageKeys.EMAIL_WELCOME_ACCOUNT_CREATED,
      language,
    );
    const loginInstructions = this.getTranslation(
      MessageKeys.EMAIL_WELCOME_LOGIN_INSTRUCTIONS,
      language,
    );
    const buttonText = this.getTranslation(
      MessageKeys.EMAIL_WELCOME_LOGIN_BUTTON_TEXT,
      language,
    );
    const credentialsTitle = this.getTranslation(
      MessageKeys.EMAIL_WELCOME_CREDENTIALS_TITLE,
      language,
    );
    const emailLabel = this.getTranslation(
      MessageKeys.EMAIL_WELCOME_EMAIL_LABEL,
      language,
    );
    const passwordLabel = this.getTranslation(
      MessageKeys.EMAIL_WELCOME_PASSWORD_LABEL,
      language,
    );
    const changePasswordNote = this.getTranslation(
      MessageKeys.EMAIL_WELCOME_CHANGE_PASSWORD_NOTE,
      language,
    );
    const supportNote = this.getTranslation(
      MessageKeys.EMAIL_WELCOME_SUPPORT_NOTE,
      language,
    );
    const footer = this.getTranslation(
      MessageKeys.EMAIL_WELCOME_FOOTER,
      language,
    );

    const isRTL = language === 'fa' || language === 'ar';
    const dirAttribute = isRTL ? 'dir="rtl"' : 'dir="ltr"';
    const textAlign = isRTL ? 'text-align: right;' : 'text-align: left;';
    const fontFamily = isRTL
      ? 'font-family: "Tahoma", "Segoe UI", sans-serif;'
      : 'font-family: "Arial", "Helvetica", sans-serif;';

    return `
      <!DOCTYPE html>
      <html ${dirAttribute} lang="${language}">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            ${fontFamily} 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            ${textAlign}
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            ${isRTL ? 'direction: rtl;' : 'direction: ltr;'}
          }
          .header { 
            background-color: #007bff; 
            color: white; 
            padding: 20px; 
            text-align: center; 
            border-radius: 8px 8px 0 0;
          }
          .content { 
            padding: 20px; 
            background-color: #f9f9f9; 
            ${textAlign}
          }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #28a745; 
            color: white; 
            text-decoration: none; 
            border-radius: 4px; 
            margin: 20px 0;
          }
          .footer { 
            padding: 20px; 
            text-align: center; 
            font-size: 12px; 
            color: #666; 
            background-color: #f8f9fa;
            border-radius: 0 0 8px 8px;
          }
          .credentials-box {
            background-color: #ffffff;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .credential-item {
            margin: 10px 0;
            font-family: monospace;
          }
          .credential-label {
            font-weight: bold;
            color: #495057;
          }
          .credential-value {
            background-color: #e9ecef;
            padding: 5px 8px;
            border-radius: 4px;
            display: inline-block;
            margin-left: ${isRTL ? '0' : '10px'};
            margin-right: ${isRTL ? '10px' : '0'};
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${header}</h1>
          </div>
          <div class="content">
            <h2>${hello}</h2>
            <p>${accountCreated}</p>
            <p>${loginInstructions}</p>
            
            <div class="credentials-box">
              <h3>${credentialsTitle}</h3>
              <div class="credential-item">
                <span class="credential-label">${emailLabel}</span>
                <span class="credential-value">${data.email}</span>
              </div>
              <div class="credential-item">
                <span class="credential-label">${passwordLabel}</span>
                <span class="credential-value">${data.password}</span>
              </div>
            </div>
            
            <a href="${data.loginUrl}" class="button">${buttonText}</a>
            
            <div class="warning">
              <p>${changePasswordNote}</p>
            </div>
          </div>
          <div class="footer">
            <p>${footer}</p>
            <p>${supportNote}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send profile update notification email (?)
   */
  async sendProfileUpdateEmail(
    email: string,
    subject: string,
    emailContent: any,
    language: string = 'en',
  ): Promise<void> {
    try {
      const htmlContent = this.generateProfileUpdateHtml(
        emailContent,
        language,
      );

      const mailOptions = {
        from: this.configService.get<string>('EMAIL_FROM'),
        to: email,
        subject,
        html: htmlContent,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Profile update email sent successfully to ${email}`, {
        messageId: result.messageId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send profile update email to ${email}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Generate HTML content for profile update notification email
   */
  private generateProfileUpdateHtml(
    content: any,
    language: string = 'en',
  ): string {
    const changesHtml = content.changes
      .map((change: string) => `<li>${change}</li>`)
      .join('');

    // Determine if RTL is needed
    const isRTL = language === 'fa' || language === 'ar';
    const dirAttribute = isRTL ? 'dir="rtl"' : 'dir="ltr"';
    const textAlign = isRTL ? 'text-align: right;' : 'text-align: left;';
    const fontFamily = isRTL
      ? 'font-family: "Tahoma", "Segoe UI", sans-serif;'
      : 'font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;';
    const listDirection = isRTL
      ? 'padding-right: 20px;'
      : 'padding-left: 20px;';

    return `
      <!DOCTYPE html>
      <html ${dirAttribute} lang="${language}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${content.header}</title>
        <style>
          body {
            ${fontFamily}
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
            ${textAlign}
            ${isRTL ? 'direction: rtl;' : 'direction: ltr;'}
          }
          .container {
            background-color: #ffffff;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            ${textAlign}
            ${isRTL ? 'direction: rtl;' : 'direction: ltr;'}
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin-bottom: 30px;
            ${isRTL ? 'direction: rtl;' : 'direction: ltr;'}
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            text-align: center;
          }
          .content {
            ${textAlign}
            ${isRTL ? 'direction: rtl;' : 'direction: ltr;'}
          }
          .content h2 {
            ${textAlign}
            margin-bottom: 15px;
          }
          .content p {
            ${textAlign}
            margin-bottom: 15px;
          }
          .changes-box {
            background-color: #f8f9fa;
            border-${isRTL ? 'right' : 'left'}: 4px solid #007bff;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            ${textAlign}
            ${isRTL ? 'direction: rtl;' : 'direction: ltr;'}
          }
          .changes-box h3 {
            margin-top: 0;
            color: #007bff;
            ${textAlign}
          }
          .changes-box ul {
            margin: 10px 0;
            ${listDirection}
            ${textAlign}
          }
          .changes-box li {
            ${textAlign}
            margin-bottom: 5px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            font-size: 12px;
            color: #666;
            ${isRTL ? 'direction: rtl;' : 'direction: ltr;'}
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
            ${textAlign}
            ${isRTL ? 'direction: rtl;' : 'direction: ltr;'}
          }
          .warning p {
            ${textAlign}
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${content.header}</h1>
          </div>
          <div class="content">
            <h2>${content.greeting}</h2>
            <p>${content.notification}</p>
            
            <div class="changes-box">
              <h3>${content.changesTitle}</h3>
              <ul>${changesHtml}</ul>
            </div>
            
            <div class="warning">
              <p>${content.contactSupport}</p>
            </div>
          </div>
          <div class="footer">
            <p>${content.footer}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send admin password reset link email
   */
  async sendAdminResetLinkEmail(
    email: string,
    subject: string,
    emailContent: any,
    resetUrl: string,
    language: string = 'fa',
  ): Promise<void> {
    try {
      const htmlContent = this.generateAdminResetLinkTemplate(
        emailContent,
        resetUrl,
        language,
      );

      const mailOptions = {
        from: this.configService.get<string>('EMAIL_FROM'),
        to: email,
        subject,
        html: htmlContent,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Admin reset link email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send admin reset link email to ${email}`,
        error,
      );
      throw new Error(MessageKeys.EMAIL_SERVICE_ERROR);
    }
  }

  /**
   * Generate HTML template for admin reset link email
   */
  private generateAdminResetLinkTemplate(
    content: any,
    resetUrl: string,
    language: string,
  ): string {
    // Determine if RTL is needed
    const isRTL = language === 'fa' || language === 'ar';
    const dirAttribute = isRTL ? 'dir="rtl"' : 'dir="ltr"';
    const textAlign = isRTL ? 'text-align: right;' : 'text-align: left;';
    const fontFamily = isRTL
      ? 'font-family: "Tahoma", "Segoe UI", sans-serif;'
      : 'font-family: "Arial", "Helvetica", sans-serif;';

    return `
      <!DOCTYPE html>
      <html ${dirAttribute} lang="${language}">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            ${fontFamily} 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            ${textAlign}
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            ${isRTL ? 'direction: rtl;' : 'direction: ltr;'}
          }
          .header { 
            background-color: #007bff; 
            color: white; 
            padding: 20px; 
            text-align: center; 
            border-radius: 8px 8px 0 0;
          }
          .content { 
            padding: 20px; 
            background-color: #f9f9f9; 
            ${textAlign}
          }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #dc3545; 
            color: white; 
            text-decoration: none; 
            border-radius: 4px; 
            margin: 20px 0;
            text-align: center;
          }
          .footer { 
            padding: 20px; 
            text-align: center; 
            font-size: 12px; 
            color: #666; 
            background-color: #f8f9fa;
            border-radius: 0 0 8px 8px;
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
          }
          .security-note {
            background-color: #d1ecf1;
            border: 1px solid #bee5eb;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
            color: #0c5460;
          }
          .link-box {
            background-color: #ffffff;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${content.header}</h1>
          </div>
          <div class="content">
            <h2>${content.greeting}</h2>
            <p>${content.notification}</p>
            
            <div class="link-box">
              <p>${content.linkDescription}</p>
              <a href="${resetUrl}" class="button">${content.buttonText}</a>
            </div>
            
            <div class="warning">
              <p>${content.expiryNote}</p>
            </div>
            
            <div class="security-note">
              <p>${content.securityNote}</p>
            </div>
          </div>
          <div class="footer">
            <p>${content.footer}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send admin password reset email with temporary password
   */
  async sendAdminResetPasswordEmail(
    email: string,
    subject: string,
    emailContent: any,
    temporaryPassword: string,
    language: string = 'fa',
  ): Promise<void> {
    try {
      const htmlContent = this.generateAdminResetPasswordTemplate(
        emailContent,
        temporaryPassword,
        language,
      );

      const mailOptions = {
        from: this.configService.get<string>('EMAIL_FROM'),
        to: email,
        subject,
        html: htmlContent,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `Admin reset password email sent successfully to ${email}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send admin reset password email to ${email}`,
        error,
      );
      throw new Error(MessageKeys.EMAIL_SERVICE_ERROR);
    }
  }

  /**
   * Generate HTML template for admin reset password email
   */
  private generateAdminResetPasswordTemplate(
    content: any,
    temporaryPassword: string,
    language: string,
  ): string {
    // Determine if RTL is needed
    const isRTL = language === 'fa' || language === 'ar';
    const dirAttribute = isRTL ? 'dir="rtl"' : 'dir="ltr"';
    const textAlign = isRTL ? 'text-align: right;' : 'text-align: left;';
    const fontFamily = isRTL
      ? 'font-family: "Tahoma", "Segoe UI", sans-serif;'
      : 'font-family: "Arial", "Helvetica", sans-serif;';

    return `
      <!DOCTYPE html>
      <html ${dirAttribute} lang="${language}">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            ${fontFamily} 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            ${textAlign}
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            ${isRTL ? 'direction: rtl;' : 'direction: ltr;'}
          }
          .header { 
            background-color: #dc3545; 
            color: white; 
            padding: 20px; 
            text-align: center; 
            border-radius: 8px 8px 0 0;
          }
          .content { 
            padding: 20px; 
            background-color: #f9f9f9; 
            ${textAlign}
          }
          .footer { 
            padding: 20px; 
            text-align: center; 
            font-size: 12px; 
            color: #666; 
            background-color: #f8f9fa;
            border-radius: 0 0 8px 8px;
          }
          .password-box {
            background-color: #ffffff;
            border: 2px solid #dc3545;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
          }
          .password-value {
            background-color: #f8f9fa;
            font-family: monospace;
            font-size: 18px;
            font-weight: bold;
            padding: 15px;
            border-radius: 4px;
            color: #dc3545;
            border: 1px solid #dee2e6;
            letter-spacing: 2px;
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
          }
          .security-note {
            background-color: #d1ecf1;
            border: 1px solid #bee5eb;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
            color: #0c5460;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${content.header}</h1>
          </div>
          <div class="content">
            <h2>${content.greeting}</h2>
            <p>${content.notification}</p>
            
            <div class="password-box">
              <p>${content.temporaryPassword}</p>
              <div class="password-value">${temporaryPassword}</div>
            </div>
            
            <p>${content.loginInstructions}</p>
            
            <div class="warning">
              <p>${content.changePasswordNote}</p>
            </div>
            
            <div class="security-note">
              <p>${content.securityNote}</p>
            </div>
          </div>
          <div class="footer">
            <p>${content.footer}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send user status change notification email with RTL support
   */
  async sendStatusChangeEmail(
    email: string,
    subject: string,
    emailContent: any,
    language: string = 'fa',
  ): Promise<void> {
    try {
      const htmlContent = this.generateStatusChangeHtml(emailContent, language);

      const mailOptions = {
        from: this.configService.get<string>('EMAIL_FROM'),
        to: email,
        subject,
        html: htmlContent,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Status change email sent successfully to ${email}`, {
        messageId: result.messageId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send status change email to ${email}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Generate HTML content for status change notification email with RTL support
   */
  private generateStatusChangeHtml(
    content: any,
    language: string = 'en',
  ): string {
    // Determine if RTL is needed
    const isRTL = language === 'fa' || language === 'ar';
    const dirAttribute = isRTL ? 'dir="rtl"' : 'dir="ltr"';
    const textAlign = isRTL ? 'text-align: right;' : 'text-align: left;';
    const fontFamily = isRTL
      ? 'font-family: "Tahoma", "Segoe UI", sans-serif;'
      : 'font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;';

    // Determine colors based on status change type
    const isDeactivation = content.isDeactivation;
    const headerBgColor = isDeactivation ? '#f8d7da' : '#d4edda';
    const headerTextColor = isDeactivation ? '#721c24' : '#155724';

    return `
      <!DOCTYPE html>
      <html ${dirAttribute} lang="${language}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${content.header}</title>
        <style>
          body {
            ${fontFamily}
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
            ${textAlign}
            ${isRTL ? 'direction: rtl;' : 'direction: ltr;'}
          }
          .container {
            background-color: #ffffff;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            ${textAlign}
            ${isRTL ? 'direction: rtl;' : 'direction: ltr;'}
          }
          .header {
            background-color: ${headerBgColor};
            color: ${headerTextColor};
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin-bottom: 30px;
            ${isRTL ? 'direction: rtl;' : 'direction: ltr;'}
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            text-align: center;
          }
          .content {
            ${textAlign}
            ${isRTL ? 'direction: rtl;' : 'direction: ltr;'}
          }
          .content h2 {
            ${textAlign}
            margin-bottom: 15px;
          }
          .content p {
            ${textAlign}
            margin-bottom: 15px;
          }
          .reason-section {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
            ${textAlign}
            ${isRTL ? 'direction: rtl;' : 'direction: ltr;'}
          }
          .reason-section p {
            ${textAlign}
            margin: 0;
            font-weight: bold;
          }
          .consequences-box {
            background-color: #f8f9fa;
            border-${isRTL ? 'right' : 'left'}: 4px solid #007bff;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            ${textAlign}
            ${isRTL ? 'direction: rtl;' : 'direction: ltr;'}
          }
          .consequences-box p {
            ${textAlign}
            margin: 0;
            white-space: pre-line;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            font-size: 12px;
            color: #666;
            ${isRTL ? 'direction: rtl;' : 'direction: ltr;'}
          }
          .support-message {
            ${textAlign}
            margin: 20px 0;
            ${isRTL ? 'direction: rtl;' : 'direction: ltr;'}
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${content.header}</h1>
          </div>
          <div class="content">
            <h2>${content.greeting}</h2>
            <p>${content.mainMessage}</p>
            
            ${content.reasonSection ? `<div class="reason-section"><p>${content.reasonSection}</p></div>` : ''}
            
            <div class="consequences-box">
              <p>${content.consequences}</p>
            </div>
            
            <div class="support-message">
              <p>${content.supportMessage}</p>
            </div>
          </div>
          <div class="footer">
            <p>${content.footer}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generic method to send email
   * Used for custom email content like status change notifications
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    try {
      const mailOptions = {
        from: this.configService.get<string>('EMAIL_FROM'),
        to: options.to,
        subject: options.subject,
        html: options.html,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to ${options.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      throw error;
    }
  }
}
