import { ApiProperty } from '@nestjs/swagger';
import { PermissionAction, RoleName } from '../../common/enums';

export class RolePermissionDto {
  @ApiProperty({
    description: 'Permission ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  permissionId: string;

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
    description: 'Whether this permission is granted to the role',
    example: true,
  })
  isGranted: boolean;
}

export class RolePermissionsData {
  @ApiProperty({
    description: 'Role ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  roleId: string;

  @ApiProperty({
    description: 'Role name',
    enum: RoleName,
    example: RoleName.ADMIN,
  })
  roleName: RoleName;

  @ApiProperty({
    description: 'List of permissions for this role',
    type: [RolePermissionDto],
  })
  permissions: RolePermissionDto[];
}

export class RolePermissionsResponse {
  @ApiProperty({
    description: 'Response code',
    example: 'permissions.ROLE_PERMISSIONS_RETRIEVED',
  })
  code: string;

  @ApiProperty({
    description: 'Localized response message',
    example: 'Role permissions retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Role permissions data',
    type: RolePermissionsData,
  })
  data: RolePermissionsData;
}
