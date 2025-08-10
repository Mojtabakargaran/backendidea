import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/**
 * Password Reset Request Response DTO
 * Success response for password reset link request
 * Implements ? - Password Reset Request
 */
export class PasswordResetRequestResponseDto {
  @ApiProperty({
    description: 'Success message code',
    example: 'auth.PASSWORD_RESET_LINK_SENT',
    enum: ['auth.PASSWORD_RESET_LINK_SENT'],
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Localized success message',
    example: 'Reset link sent to your email',
  })
  @IsString()
  message: string;
}
