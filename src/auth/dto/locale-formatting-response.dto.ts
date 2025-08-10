import { ApiProperty } from '@nestjs/swagger';
import { MessageKeys } from '@/common/message-keys';

/**
 * Date Format Configuration DTO
 */
export class DateFormatDto {
  @ApiProperty({
    description: 'Calendar system used for date formatting',
    enum: ['persian', 'gregorian'],
    example: 'persian',
  })
  calendar: 'persian' | 'gregorian';

  @ApiProperty({
    description: 'Date format pattern',
    example: 'YYYY/MM/DD',
  })
  format: string;

  @ApiProperty({
    description: 'Example formatted date',
    example: '۱۴۰۳/۰۱/۱۵',
  })
  example: string;
}

/**
 * Number Format Configuration DTO
 */
export class NumberFormatDto {
  @ApiProperty({
    description: 'Digit system used for number formatting',
    enum: ['persian', 'arabic', 'latin'],
    example: 'persian',
  })
  digits: 'persian' | 'arabic' | 'latin';

  @ApiProperty({
    description: 'Decimal separator character',
    example: '/',
  })
  decimal: string;

  @ApiProperty({
    description: 'Thousands separator character',
    example: '،',
  })
  thousands: string;

  @ApiProperty({
    description: 'Example formatted number',
    example: '۱۲۳،۴۵۶/۷۸',
  })
  example: string;
}

/**
 * Currency Format Configuration DTO
 */
export class CurrencyFormatDto {
  @ApiProperty({
    description: 'Currency code',
    enum: ['IRR', 'AED'],
    example: 'IRR',
  })
  code: 'IRR' | 'AED';

  @ApiProperty({
    description: 'Currency symbol',
    example: 'ریال',
  })
  symbol: string;

  @ApiProperty({
    description: 'Currency symbol position',
    enum: ['before', 'after'],
    example: 'after',
  })
  position: 'before' | 'after';

  @ApiProperty({
    description: 'Example formatted currency',
    example: '۱۲۳،۴۵۶ ریال',
  })
  example: string;
}

/**
 * Locale Formatting Configuration Data DTO
 */
export class LocaleFormattingDataDto {
  @ApiProperty({
    description: 'Tenant locale setting',
    enum: ['iran', 'uae'],
    example: 'iran',
  })
  locale: 'iran' | 'uae';

  @ApiProperty({
    description: 'Tenant language setting',
    enum: ['persian', 'arabic'],
    example: 'persian',
  })
  language: 'persian' | 'arabic';

  @ApiProperty({
    description: 'Date formatting configuration',
    type: DateFormatDto,
  })
  dateFormat: DateFormatDto;

  @ApiProperty({
    description: 'Number formatting configuration',
    type: NumberFormatDto,
  })
  numberFormat: NumberFormatDto;

  @ApiProperty({
    description: 'Currency formatting configuration',
    type: CurrencyFormatDto,
  })
  currencyFormat: CurrencyFormatDto;
}

/**
 * Locale Formatting Configuration Response DTO
 * Used for GET /api/locale/formatting endpoint
 */
export class LocaleFormattingResponseDto {
  @ApiProperty({
    description: 'Response message key',
    enum: [MessageKeys.FORMATTING_CONFIG_SUCCESS],
    example: MessageKeys.FORMATTING_CONFIG_SUCCESS,
  })
  code: typeof MessageKeys.FORMATTING_CONFIG_SUCCESS;

  @ApiProperty({
    description: 'Localized success message',
    example: 'Locale formatting configuration retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Locale formatting configuration data',
    type: LocaleFormattingDataDto,
  })
  data: LocaleFormattingDataDto;
}
