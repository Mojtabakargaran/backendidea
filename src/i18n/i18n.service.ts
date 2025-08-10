import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface TranslationResponse {
  code: string;
  message: string;
}

@Injectable()
export class I18nService {
  private translations: Record<string, any> = {};

  constructor() {
    this.loadTranslations();
  }

  private loadTranslations() {
    try {
      const translationsPath = join(__dirname, '.');
      this.translations.en = JSON.parse(
        readFileSync(join(translationsPath, 'en.json'), 'utf8'),
      );
      this.translations.fa = JSON.parse(
        readFileSync(join(translationsPath, 'fa.json'), 'utf8'),
      );
      this.translations.ar = JSON.parse(
        readFileSync(join(translationsPath, 'ar.json'), 'utf8'),
      );
    } catch (error) {
      console.warn(
        'Failed to load translations, using fallback values:',
        error.message,
      );
      // Fallback translations
      this.translations = {
        en: {
          auth: {
            REGISTRATION_SUCCESS:
              'Registration successful. Please check your email for verification.',
            EMAIL_ALREADY_EXISTS: 'This email address is already registered',
          },
        },
        fa: {
          auth: {
            REGISTRATION_SUCCESS:
              'ثبت نام با موفقیت انجام شد. لطفاً ایمیل خود را برای تأیید بررسی کنید.',
            EMAIL_ALREADY_EXISTS: 'این آدرس ایمیل قبلاً ثبت شده است',
          },
        },
        ar: {
          auth: {
            REGISTRATION_SUCCESS:
              'تم التسجيل بنجاح. يرجى التحقق من بريدك الإلكتروني للتحقق.',
            EMAIL_ALREADY_EXISTS: 'عنوان البريد الإلكتروني هذا مسجل بالفعل',
          },
        },
      };
    }
  }

  /**
   * Translates a message key based on Accept-Language header
   * @param key - Message key (e.g., 'auth.REGISTRATION_SUCCESS')
   * @param acceptLanguage - Accept-Language header value
   * @returns Translated message with code and localized message
   */
  translate(key: string, acceptLanguage?: string): TranslationResponse {
    const language = this.parseAcceptLanguage(acceptLanguage);
    const message = this.getTranslation(key, language);

    return {
      code: key,
      message,
    };
  }

  /**
   * Parse Accept-Language header to determine preferred language
   * @param acceptLanguage - Accept-Language header value
   * @returns Language code (en, fa, ar)
   */
  private parseAcceptLanguage(acceptLanguage?: string): string {
    if (!acceptLanguage) {
      return 'en'; // Default fallback
    }

    // Parse Accept-Language header (e.g., "fa,en;q=0.9,ar;q=0.8")
    const languages = acceptLanguage
      .split(',')
      .map((lang) => {
        const [code, qValue] = lang.trim().split(';q=');
        return {
          code: code.toLowerCase().split('-')[0], // Extract primary language
          priority: qValue ? parseFloat(qValue) : 1.0,
        };
      })
      .sort((a, b) => b.priority - a.priority);

    // Find first supported language
    for (const lang of languages) {
      if (this.translations[lang.code]) {
        return lang.code;
      }
    }

    return 'en'; // Fallback to English
  }

  /**
   * Get translation for a specific key and language
   * @param key - Message key in dot notation
   * @param language - Language code
   * @returns Translated message or English fallback
   */
  private getTranslation(key: string, language: string): string {
    const translation = this.translations[language] || this.translations.en;
    const keys = key.split('.');

    let result = translation;
    for (const k of keys) {
      result = result?.[k];
      if (!result) {
        break;
      }
    }

    // Fallback to English if translation not found
    if (!result && language !== 'en') {
      result = this.getTranslation(key, 'en');
    }

    return result || key; // Return key itself if no translation found
  }

  /**
   * Get all supported languages
   * @returns Array of supported language codes
   */
  getSupportedLanguages(): string[] {
    return Object.keys(this.translations);
  }
}
