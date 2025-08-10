import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@/common/enums';

/**
 * DTO for user profile update response (?)
 */
export class UpdateUserResponseDto {
  @ApiProperty({
    description: 'Response code indicating the result of the operation',
    example: 'users.USER_UPDATED_SUCCESS',
  })
  code: string;

  @ApiProperty({
    description: 'Localized message describing the result',
    example: 'User profile updated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'User profile data after update',
    type: 'object',
  })
  data: UserUpdateData;
}

export class UserUpdateData {
  @ApiProperty({
    description: 'Unique identifier of the updated user',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  userId: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'Ahmad Rezaei',
  })
  fullName: string;

  @ApiProperty({
    description: 'Email address of the user (read-only)',
    example: 'ahmad.rezaei@company.com',
  })
  email: string;

  @ApiPropertyOptional({
    description: 'Phone number in international format',
    example: '+971501234567',
    nullable: true,
  })
  phoneNumber?: string | null;

  @ApiProperty({
    description: 'Current status',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @ApiPropertyOptional({
    description: 'Role ID assigned to the user',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
    nullable: true,
  })
  roleId?: string | null;

  @ApiPropertyOptional({
    description: 'Role name assigned to the user',
    example: 'admin',
    nullable: true,
  })
  roleName?: string | null;

  @ApiProperty({
    description: 'Timestamp when the user profile was last updated',
    example: '2025-07-20T15:45:00Z',
    format: 'date-time',
  })
  updatedAt: string;

  @ApiProperty({
    description: 'List of fields that were modified in this update',
    example: ['fullName', 'phoneNumber'],
    type: [String],
  })
  modifiedFields: string[];

  @ApiProperty({
    description: 'Whether notification email was sent to the user',
    example: true,
  })
  notificationSent: boolean;
}
