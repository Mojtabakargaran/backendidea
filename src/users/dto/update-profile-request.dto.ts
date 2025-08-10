import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

/**
 * Update Profile Request DTO
 * For updating current user's profile information (?)
 */
export class UpdateProfileRequestDto {
  @ApiProperty({
    description: 'User full name (first and last name)',
    example: 'احمد محمدی',
    required: false,
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Full name cannot exceed 100 characters' })
  fullName?: string;

  @ApiProperty({
    description: 'Phone number in international format (+country code)',
    example: '+98 912 345 6789',
    required: false,
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Phone number cannot exceed 20 characters' })
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in international format (+country code)',
  })
  phoneNumber?: string;
}

/**
 * Update Profile Response DTO
 * Contains updated fields information
 */
export class UpdateProfileResponseDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Updated user full name',
    example: 'احمد محمدی',
    required: false,
  })
  fullName?: string;

  @ApiProperty({
    description: 'Updated user phone number',
    example: '+98 912 345 6789',
    required: false,
  })
  phoneNumber?: string;

  @ApiProperty({
    description: 'List of fields that were updated',
    type: [String],
    example: ['fullName', 'phoneNumber'],
  })
  updatedFields: string[];

  @ApiProperty({
    description: 'Timestamp when profile was updated',
    example: '2025-01-15T10:30:00Z',
  })
  updatedAt: string;
}

/**
 * Update Profile API Response DTO
 * Standard API response wrapper for profile update
 */
export class UpdateProfileApiResponseDto {
  @ApiProperty({
    description: 'Response code for localization',
    example: 'users.PROFILE_UPDATED',
  })
  code: string;

  @ApiProperty({
    description: 'Localized response message',
    example: 'Profile updated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Profile update result data',
    type: UpdateProfileResponseDto,
  })
  data: UpdateProfileResponseDto;
}
