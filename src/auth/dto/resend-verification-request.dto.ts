import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

/**
 * Resend Verification Request DTO
 * Used for requesting resend of email verification
 * Implements ? - Email Verification Process
 */
export class ResendVerificationRequestDto {
  @ApiProperty({
    description: 'Email address to resend verification to',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail(
    {},
    {
      message: 'validation.INVALID_EMAIL_FORMAT',
    },
  )
  @IsNotEmpty({
    message: 'validation.FIELD_REQUIRED',
  })
  email: string;
}
