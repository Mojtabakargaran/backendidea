import { Injectable } from '@nestjs/common';
import { Language, Locale } from '@/common/enums';
import { LocaleFormattingDataDto } from '../dto/locale-formatting-response.dto';

/**
 * Locale Formatting Service
 * Handles locale-specific formatting configuration (?)
 * Provides date, number, and currency formatting settings based on tenant locale
 */
@Injectable()
export class LocaleFormattingService {
  /**
   * Get locale formatting configuration for a tenant
   * @param language - Tenant language setting
   * @param locale - Tenant locale setting
   * @returns Locale formatting configuration
   */
  getFormattingConfig(
    language: Language,
    locale: Locale,
  ): LocaleFormattingDataDto {
    // BR33: Iran locale uses Persian calendar for date display
    // BR34: UAE locale uses Gregorian calendar for date display
    // BR35: Number formatting must use appropriate digit system
    // BR36: Currency display must match locale conventions

    if (locale === Locale.IRAN) {
      return {
        locale: 'iran',
        language: 'persian',
        dateFormat: {
          calendar: 'persian',
          format: 'YYYY/MM/DD',
          example: '۱۴۰۳/۰۱/۱۵',
        },
        numberFormat: {
          digits: 'persian',
          decimal: '/',
          thousands: '،',
          example: '۱۲۳،۴۵۶/۷۸',
        },
        currencyFormat: {
          code: 'IRR',
          symbol: 'ریال',
          position: 'after',
          example: '۱۲۳،۴۵۶ ریال',
        },
      };
    } else if (locale === Locale.UAE) {
      return {
        locale: 'uae',
        language: 'arabic',
        dateFormat: {
          calendar: 'gregorian',
          format: 'DD/MM/YYYY',
          example: '١٥/٠١/٢٠٢٥',
        },
        numberFormat: {
          digits: 'arabic',
          decimal: '٫',
          thousands: '،',
          example: '١٢٣،٤٥٦٫٧٨',
        },
        currencyFormat: {
          code: 'AED',
          symbol: 'د.إ',
          position: 'before',
          example: 'د.إ ١٢٣،٤٥٦',
        },
      };
    }

    // Default fallback (should not occur with proper validation)
    return {
      locale: 'iran',
      language: 'persian',
      dateFormat: {
        calendar: 'persian',
        format: 'YYYY/MM/DD',
        example: '۱۴۰۳/۰۱/۱۵',
      },
      numberFormat: {
        digits: 'persian',
        decimal: '/',
        thousands: '،',
        example: '۱۲۳،۴۵۶/۷۸',
      },
      currencyFormat: {
        code: 'IRR',
        symbol: 'ریال',
        position: 'after',
        example: '۱۲۳،۴۵۶ ریال',
      },
    };
  }
}
