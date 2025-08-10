import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
} from 'class-validator';

/**
 * Change Password Request DTO
 * For changing current user's password (?)
 */
export class ChangePasswordRequestDto {
  @ApiProperty({
    description: 'Current password for verification',
    example: 'CurrentPassword123!',
    minLength: 1,
  })
  @IsNotEmpty({ message: 'Current password is required' })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description: 'New password (must meet policy requirements)',
    example: 'NewSecurePassword123!',
    minLength: 8,
    maxLength: 128,
  })
  @IsNotEmpty({ message: 'New password is required' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password cannot exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  newPassword: string;

  @ApiProperty({
    description: 'Confirm new password (must match new password)',
    example: 'NewSecurePassword123!',
    minLength: 8,
    maxLength: 128,
  })
  @IsNotEmpty({ message: 'Password confirmation is required' })
  @IsString()
  confirmPassword: string;
}

/**
 * Change Password Response DTO
 * Contains information about password change operation
 */
export class ChangePasswordResponseDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Number of other user sessions that were invalidated',
    example: 2,
  })
  sessionsInvalidated: number;

  @ApiProperty({
    description: 'Timestamp when password was changed',
    example: '2025-01-15T10:30:00Z',
  })
  passwordChangedAt: string;
}

/**
 * Change Password API Response DTO
 * Standard API response wrapper for password change
 */
export class ChangePasswordApiResponseDto {
  @ApiProperty({
    description: 'Response code for localization',
    example: 'users.PASSWORD_CHANGED',
  })
  code: string;

  @ApiProperty({
    description: 'Localized response message',
    example: 'Password changed successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Password change result data',
    type: ChangePasswordResponseDto,
  })
  data: ChangePasswordResponseDto;
}
