import { ApiProperty } from '@nestjs/swagger';

/**
 * Resend Verification Response DTO
 * Used for successful resend verification responses
 * Implements ? - Email Verification Process
 */
export class ResendVerificationResponseDto {
  @ApiProperty({
    description: 'Response code for resend verification success',
    example: 'auth.VERIFICATION_EMAIL_SENT',
    enum: ['auth.VERIFICATION_EMAIL_SENT'],
  })
  code: string;

  @ApiProperty({
    description: 'Localized success message',
    example: 'Verification email sent successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Response data containing email information',
    type: 'object',
    properties: {
      email: {
        type: 'string',
        format: 'email',
        description: 'Email address where verification was sent',
        example: 'user@example.com',
      },
      expiresAt: {
        type: 'string',
        format: 'date-time',
        description: 'Verification token expiration timestamp',
        example: '2024-01-15T12:30:00Z',
      },
    },
  })
  data: {
    email: string;
    expiresAt: string;
  };
}
