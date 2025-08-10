import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Reset Password Request DTO for ?
 * Used for admin-initiated password resets
 */
export class ResetPasswordDto {
  @ApiProperty({
    description: 'Method to use for password reset',
    enum: ['admin_reset_link', 'admin_temporary_password'],
    example: 'admin_reset_link',
  })
  @IsEnum(['admin_reset_link', 'admin_temporary_password'], {
    message:
      'Reset method must be either admin_reset_link or admin_temporary_password',
  })
  resetMethod: 'admin_reset_link' | 'admin_temporary_password';
}
