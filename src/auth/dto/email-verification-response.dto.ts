import { ApiProperty } from '@nestjs/swagger';

/**
 * Email Verification Response DTO
 * Used for successful email verification responses
 * Implements ? - Email Verification Process
 */
export class EmailVerificationResponseDto {
  @ApiProperty({
    description: 'Response code for email verification success',
    example: 'auth.EMAIL_VERIFIED_SUCCESS',
    enum: ['auth.EMAIL_VERIFIED_SUCCESS'],
  })
  code: string;

  @ApiProperty({
    description: 'Localized success message',
    example: 'Email verified successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Response data containing user information',
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        format: 'uuid',
        description: 'User ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
      },
      email: {
        type: 'string',
        format: 'email',
        description: 'Verified email address',
        example: 'user@example.com',
      },
      verifiedAt: {
        type: 'string',
        format: 'date-time',
        description: 'Email verification timestamp',
        example: '2024-01-15T10:30:00Z',
      },
      redirectUrl: {
        type: 'string',
        description: 'URL to redirect user after verification',
        example: '/login',
      },
      language: {
        type: 'string',
        enum: ['fa', 'ar'],
        description: "User's preferred language from email link",
        example: 'ar',
      },
    },
  })
  data: {
    userId: string;
    email: string;
    verifiedAt: string;
    redirectUrl: string;
    language?: string;
  };
}
