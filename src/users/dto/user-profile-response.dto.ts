import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '@/common/enums';

/**
 * User Profile Response DTO
 * Represents current user's profile information for ?
 */
export class UserProfileResponseDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User full name',
    example: 'احمد محمدی',
  })
  fullName: string;

  @ApiProperty({
    description: 'User email address',
    example: 'ahmad.mohammadi@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User phone number in international format',
    example: '+98 912 345 6789',
    required: false,
  })
  phoneNumber?: string;

  @ApiProperty({
    description: 'User account status',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @ApiProperty({
    description: 'User assigned role name',
    example: 'Manager',
  })
  roleName: string;

  @ApiProperty({
    description: 'Last login timestamp',
    example: '2025-01-15T10:30:00Z',
    required: false,
  })
  lastLoginAt?: string;

  @ApiProperty({
    description: 'Last login IP address',
    example: '192.168.1.100',
    required: false,
  })
  lastLoginIp?: string;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2025-01-01T00:00:00Z',
  })
  createdAt: string;
}

/**
 * User Profile API Response DTO
 * Standard API response wrapper for profile data
 */
export class UserProfileApiResponseDto {
  @ApiProperty({
    description: 'Response code for localization',
    example: 'users.PROFILE_RETRIEVED',
  })
  code: string;

  @ApiProperty({
    description: 'Localized response message',
    example: 'Profile retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'User profile data',
    type: UserProfileResponseDto,
  })
  data: UserProfileResponseDto;
}
