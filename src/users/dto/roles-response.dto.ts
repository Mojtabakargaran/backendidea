import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { MessageKeys } from '@/common/message-keys';
import { RoleName } from '@/common/enums';

/**
 * Role Information DTO for GET /api/roles endpoint
 * Used to display available roles for user assignment dropdown
 */
export class RoleInfoDto {
  @ApiProperty({
    description: 'Unique role identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'System-defined role name',
    enum: RoleName,
    example: RoleName.ADMIN,
  })
  name: RoleName;

  @ApiProperty({
    description: 'Human-readable role display name',
    example: 'Administrator',
  })
  displayName: string;

  @ApiProperty({
    description: 'Whether the current user can assign this role to others',
    example: true,
  })
  canAssign: boolean;
}

/**
 * Success Response DTO for GET /api/roles endpoint
 * Returns list of available roles with assignment permissions
 */
export class RolesResponseDto {
  @ApiProperty({
    description: 'Success message code',
    enum: [MessageKeys.ROLES_RETRIEVED_SUCCESS],
    example: MessageKeys.ROLES_RETRIEVED_SUCCESS,
  })
  code: string;

  @ApiProperty({
    description: 'Localized success message',
    example: 'Roles retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Array of available roles with assignment permissions',
    type: [RoleInfoDto],
    example: [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'admin',
        displayName: 'Administrator',
        canAssign: true,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'manager',
        displayName: 'Manager',
        canAssign: true,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'employee',
        displayName: 'Employee',
        canAssign: false,
      },
    ],
  })
  data: RoleInfoDto[];
}

/**
 * API Response wrapper for GET /api/roles endpoint
 * Includes standard response structure with role data
 */
export class RolesApiResponseDto {
  @ApiProperty({
    description: 'Success message code',
    enum: [MessageKeys.ROLES_RETRIEVED_SUCCESS],
    example: MessageKeys.ROLES_RETRIEVED_SUCCESS,
  })
  code: string;

  @ApiProperty({
    description: 'Localized success message',
    example: 'Roles retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Array of available roles with assignment permissions',
    type: [RoleInfoDto],
  })
  data: RoleInfoDto[];
}
