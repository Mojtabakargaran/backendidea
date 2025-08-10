import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePermissionDto {
  @ApiProperty({
    description: 'Permission ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  permissionId: string;

  @ApiProperty({
    description: 'Whether to grant or revoke this permission',
    example: true,
  })
  @IsBoolean()
  isGranted: boolean;
}

export class UpdateRolePermissionsRequest {
  @ApiProperty({
    description: 'List of permissions to update for the role',
    type: [UpdatePermissionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePermissionDto)
  permissions: UpdatePermissionDto[];
}

export class UpdateRolePermissionsData {
  @ApiProperty({
    description: 'Role ID that was updated',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  roleId: string;

  @ApiProperty({
    description: 'Number of permissions that were updated',
    example: 3,
  })
  updatedPermissions: number;
}

export class UpdateRolePermissionsResponse {
  @ApiProperty({
    description: 'Response code',
    example: 'permissions.ROLE_PERMISSIONS_UPDATED',
  })
  code: string;

  @ApiProperty({
    description: 'Localized response message',
    example: 'Role permissions updated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Update result data',
    type: UpdateRolePermissionsData,
  })
  data: UpdateRolePermissionsData;
}
