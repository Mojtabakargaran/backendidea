import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject, IsOptional } from 'class-validator';

/**
 * Password Reset Complete Response DTO
 * Success response for password reset completion
 * Implements ? - Password Reset Completion
 */
export class PasswordResetCompleteResponseDto {
  @ApiProperty({
    description: 'Success message code',
    example: 'auth.PASSWORD_RESET_SUCCESS',
    enum: ['auth.PASSWORD_RESET_SUCCESS'],
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Localized success message',
    example: 'Password reset successful',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Response data',
    type: 'object',
    properties: {
      redirectUrl: {
        type: 'string',
        example: '/login',
        description: 'URL to redirect after password reset',
      },
      language: {
        type: 'string',
        enum: ['fa', 'ar'],
        example: 'ar',
        description: "User's preferred language",
      },
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  data?: {
    redirectUrl?: string;
    language?: string;
  };
}
