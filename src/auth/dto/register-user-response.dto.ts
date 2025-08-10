import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for Registration Response Data
 */
export class RegisterUserResponseDataDto {
  @ApiProperty({
    description: 'Newly created user ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  userId: string;

  @ApiProperty({
    description: 'Newly created tenant ID',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  tenantId: string;

  @ApiProperty({
    description: 'User email address',
    example: 'ahmad@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'URL to redirect user after successful registration',
    example: '/login',
  })
  redirectUrl: string;
}

/**
 * Data Transfer Object for User Registration Response
 * Follows API response format specified in README_API.md
 */
export class RegisterUserResponseDto {
  @ApiProperty({
    description: 'Message key for localization',
    example: 'auth.REGISTRATION_SUCCESS',
    enum: [
      'auth.REGISTRATION_SUCCESS',
      'auth.REGISTRATION_SUCCESS_EMAIL_DELAYED',
    ],
  })
  code: string;

  @ApiProperty({
    description: 'Human-readable success message in English',
    example:
      'Registration successful. Please check your email for verification.',
  })
  message: string;

  @ApiProperty({
    description: 'Registration response data',
  })
  data: RegisterUserResponseDataDto;
}
