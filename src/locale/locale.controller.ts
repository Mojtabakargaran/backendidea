import {
  Controller,
  Get,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { SessionAuthGuard } from '@/auth/guards/session-auth.guard';
import {
  AuthenticatedUser,
  AuthenticatedTenant,
} from '@/auth/decorators/authenticated-user.decorator';
import { User } from '@/entities/user.entity';
import { Tenant } from '@/entities/tenant.entity';
import { LocaleFormattingService } from '@/auth/services/locale-formatting.service';
import { LocaleFormattingResponseDto } from '@/auth/dto/locale-formatting-response.dto';
import { ErrorResponseDto } from '@/auth/dto/error-response.dto';
import { I18nService } from '@/i18n/i18n.service';
import { MessageKeys } from '@/common/message-keys';

/**
 * Locale Controller
 * Handles locale-specific formatting configuration endpoints
 * Implements ? - Locale-Specific Formatting
 */
@ApiTags('Locale')
@Controller('locale')
export class LocaleController {
  constructor(
    private readonly localeFormattingService: LocaleFormattingService,
    private readonly i18nService: I18nService,
  ) {}

  /**
   * Get Locale Formatting Configuration (?)
   * Returns locale-specific formatting settings for dates, numbers, and currency
   *
   * @param user - Authenticated user
   * @param tenant - Authenticated tenant
   * @param acceptLanguage - Accept-Language header
   * @returns Locale formatting configuration
   */
  @Get('formatting')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionAuthGuard)
  @ApiOperation({
    summary: 'Get Locale Formatting Configuration',
    description:
      'Retrieves locale-specific formatting settings for dates, numbers, and currency based on tenant configuration',
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'Preferred language for response messages',
    required: true,
    enum: ['en', 'fa', 'ar'],
    example: 'fa',
  })
  @ApiResponse({
    status: 200,
    description: 'Locale formatting configuration retrieved successfully',
    type: LocaleFormattingResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Session expired or invalid',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  async getFormattingConfig(
    @AuthenticatedUser() user: User,
    @AuthenticatedTenant() tenant: Tenant,
    @Headers('accept-language') acceptLanguage: string = 'en',
  ): Promise<LocaleFormattingResponseDto> {
    try {
      // Get formatting configuration based on tenant locale
      const formattingConfig = this.localeFormattingService.getFormattingConfig(
        tenant.language,
        tenant.locale,
      );

      // Get localized success message
      const translationResponse = this.i18nService.translate(
        MessageKeys.FORMATTING_CONFIG_SUCCESS,
        acceptLanguage,
      );

      return {
        code: MessageKeys.FORMATTING_CONFIG_SUCCESS,
        message: translationResponse.message,
        data: formattingConfig,
      };
    } catch (error) {
      // Log error for debugging
      console.error('Error retrieving locale formatting config:', error);

      // Return error response
      const errorTranslation = this.i18nService.translate(
        MessageKeys.FORMATTING_CONFIG_ERROR,
        acceptLanguage,
      );

      throw new Error(errorTranslation.message);
    }
  }
}
