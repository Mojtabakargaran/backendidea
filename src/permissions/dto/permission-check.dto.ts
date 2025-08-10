import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { PermissionAction, CheckResult } from '../../common/enums';

export class PermissionCheckRequest {
  @ApiProperty({
    description: 'Resource to check permission for',
    example: 'users',
  })
  @IsString()
  resource: string;

  @ApiProperty({
    description: 'Action to check permission for',
    enum: PermissionAction,
    example: PermissionAction.CREATE,
  })
  @IsEnum(PermissionAction)
  action: PermissionAction;

  @ApiProperty({
    description: 'Optional resource context for the permission check',
    example: 'userId:123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  resourceContext?: string;
}

export class PermissionCheckData {
  @ApiProperty({
    description: 'Result of the permission check',
    enum: CheckResult,
    example: CheckResult.GRANTED,
  })
  checkResult: CheckResult;

  @ApiProperty({
    description: 'Name of the permission that was checked',
    example: 'users:create',
  })
  permissionName: string;

  @ApiProperty({
    description: 'Reason for denial if permission was denied',
    example: 'Insufficient role privileges',
    required: false,
  })
  denialReason?: string;
}

export class PermissionCheckResponse {
  @ApiProperty({
    description: 'Response code',
    example: 'permissions.PERMISSION_CHECK_COMPLETED',
  })
  code: string;

  @ApiProperty({
    description: 'Localized response message',
    example: 'Permission check completed',
  })
  message: string;

  @ApiProperty({
    description: 'Permission check result data',
    type: PermissionCheckData,
  })
  data: PermissionCheckData;
}
