import { ApiProperty } from '@nestjs/swagger';

/**
 * Password Reset Data DTO for ?
 * Data structure for password reset response
 */
export class PasswordResetDataDto {
  @ApiProperty({
    description: 'ID of the user whose password was reset',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  userId: string;

  @ApiProperty({
    description: 'Reset method used',
    enum: ['admin_reset_link', 'admin_temporary_password'],
    example: 'admin_reset_link',
  })
  resetMethod: 'admin_reset_link' | 'admin_temporary_password';

  @ApiProperty({
    description:
      'Temporary password (only provided for admin_temporary_password method)',
    example: 'TempPass123!',
    required: false,
  })
  temporaryPassword?: string;

  @ApiProperty({
    description: 'When the reset token/password expires',
    example: '2025-07-22T10:30:00Z',
  })
  expiresAt: string;

  @ApiProperty({
    description: 'Whether notification email was sent successfully',
    example: true,
  })
  emailSent: boolean;

  @ApiProperty({
    description: 'Number of user sessions that were invalidated',
    example: 2,
  })
  sessionsInvalidated: number;
}

/**
 * Reset Password Response DTO for ?
 * Response structure for admin password reset operations
 */
export class ResetPasswordResponseDto {
  @ApiProperty({
    description: 'Response code following MessageKeys format',
    example: 'users.PASSWORD_RESET_SUCCESS',
  })
  code: string;

  @ApiProperty({
    description: 'Localized response message',
    example: 'Password reset initiated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Reset operation data',
    type: PasswordResetDataDto,
  })
  data: PasswordResetDataDto;
}
