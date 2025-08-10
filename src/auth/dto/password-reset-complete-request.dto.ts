import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  Matches,
  IsOptional,
  IsIn,
} from 'class-validator';
import { IsPasswordMatch } from '@/common/validators/password-match.validator';

/**
 * Password Reset Complete Request DTO
 * Handles password reset completion with token
 * Implements ? - Password Reset Completion
 */
export class PasswordResetCompleteRequestDto {
  @ApiProperty({
    description: 'Reset token from email link',
    example: 'abcd1234-5678-90ef-ghij-klmnopqrstuv',
  })
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Token is required' })
  token: string;

  @ApiProperty({
    description: 'New password meeting security policy',
    example: 'NewSecure123!',
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Password must contain at least 8 characters, including uppercase, lowercase, number and special character',
    },
  )
  password: string;

  @ApiProperty({
    description: 'Password confirmation',
    example: 'NewSecure123!',
    minLength: 8,
  })
  @IsString({ message: 'Confirm password must be a string' })
  @IsNotEmpty({ message: 'Confirm password is required' })
  @IsPasswordMatch({
    message: 'Password and confirmation password do not match',
  })
  confirmPassword: string;

  @ApiProperty({
    description: "User's preferred language from email link",
    example: 'ar',
    enum: ['fa', 'ar'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Language must be a string' })
  @IsIn(['fa', 'ar'], { message: 'Language must be either fa or ar' })
  language?: string;
}
