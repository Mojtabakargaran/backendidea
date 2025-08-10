import { ApiProperty } from '@nestjs/swagger';
import { PermissionAction } from '../../common/enums';

export class PermissionDto {
  @ApiProperty({
    description: 'Permission ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Permission name',
    example: 'users:create',
  })
  name: string;

  @ApiProperty({
    description: 'Resource that the permission applies to',
    example: 'users',
  })
  resource: string;

  @ApiProperty({
    description: 'Action that the permission allows',
    enum: PermissionAction,
    example: PermissionAction.CREATE,
  })
  action: PermissionAction;

  @ApiProperty({
    description: 'Human-readable description of the permission',
    example: 'Create new user accounts',
  })
  description: string;

  @ApiProperty({
    description: 'Whether the permission is currently active',
    example: true,
  })
  isActive: boolean;
}

export class PermissionsListResponse {
  @ApiProperty({
    description: 'Response code',
    example: 'permissions.PERMISSIONS_RETRIEVED',
  })
  code: string;

  @ApiProperty({
    description: 'Localized response message',
    example: 'Permissions retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'List of available permissions',
    type: [PermissionDto],
  })
  data: PermissionDto[];
}
