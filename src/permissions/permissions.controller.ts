import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PermissionsService, AuthenticatedUser } from './permissions.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { UpdateRolePermissionsRequest } from './dto/update-role-permissions.dto';
import { PermissionCheckRequest } from './dto/permission-check.dto';
import { PermissionAuditQuery } from './dto/permission-audit.dto';
import { PermissionsListResponse } from './dto/permissions-list-response.dto';
import { RolePermissionsResponse } from './dto/role-permissions-response.dto';
import { UpdateRolePermissionsResponse } from './dto/update-role-permissions.dto';
import { PermissionCheckResponse } from './dto/permission-check.dto';
import { PermissionAuditResponse } from './dto/permission-audit.dto';
import { UsersService } from '../users/services/users.service';
import { RolesApiResponseDto } from '../users/dto/roles-response.dto';
import { I18nService } from '../i18n/i18n.service';
import { MessageKeys } from '../common/message-keys';
import { ErrorResponse } from './dto/error-response.dto';

@ApiTags('Permissions')
@Controller('permissions')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @ApiOperation({
    summary: 'List available system permissions',
    description:
      'Retrieve all available system permissions for role configuration',
  })
  @ApiHeader({
    name: 'accept-language',
    required: true,
    description: 'Language preference (fa, ar, en)',
    schema: { type: 'string', enum: ['fa', 'ar', 'en'] },
  })
  @ApiResponse({
    status: 200,
    description: 'Permissions retrieved successfully',
    type: PermissionsListResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponse,
  })
  async getPermissions(
    @Headers('accept-language') acceptLanguage: string,
  ): Promise<PermissionsListResponse> {
    return this.permissionsService.getPermissions(acceptLanguage);
  }

  @Post('check')
  @ApiOperation({
    summary: 'Check user permission',
    description:
      'Validate if current user has specific permission for resource',
  })
  @ApiHeader({
    name: 'accept-language',
    required: true,
    description: 'Language preference (fa, ar, en)',
    schema: { type: 'string', enum: ['fa', 'ar', 'en'] },
  })
  @ApiResponse({
    status: 200,
    description: 'Permission check completed',
    type: PermissionCheckResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponse,
  })
  async checkPermission(
    @Body() checkRequest: PermissionCheckRequest,
    @Request() req: any,
    @Headers('accept-language') acceptLanguage: string,
  ): Promise<PermissionCheckResponse> {
    const authenticatedUser: AuthenticatedUser = req.user;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    return this.permissionsService.checkPermission(
      checkRequest,
      authenticatedUser,
      acceptLanguage,
      ipAddress,
      userAgent,
    );
  }

  @Get('audit')
  @ApiOperation({
    summary: 'Retrieve permission audit logs',
    description: 'Get permission check audit logs with filtering options',
  })
  @ApiHeader({
    name: 'accept-language',
    required: true,
    description: 'Language preference (fa, ar, en)',
    schema: { type: 'string', enum: ['fa', 'ar', 'en'] },
  })
  @ApiResponse({
    status: 200,
    description: 'Permission audit logs retrieved successfully',
    type: PermissionAuditResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponse,
  })
  async getPermissionAudit(
    @Query() query: PermissionAuditQuery,
    @Request() req: any,
    @Headers('accept-language') acceptLanguage: string,
  ): Promise<PermissionAuditResponse> {
    const authenticatedUser: AuthenticatedUser = req.user;

    return this.permissionsService.getPermissionAudit(
      query,
      authenticatedUser,
      acceptLanguage,
    );
  }
}

@ApiTags('Roles')
@Controller('roles')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly usersService: UsersService,
    private readonly i18nService: I18nService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List available roles',
    description: 'Retrieve list of roles available for user assignment within tenant - Required for ?',
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'Language preference for response messages (required)',
    required: true,
    schema: {
      type: 'string',
      enum: ['en', 'fa', 'ar'],
      example: 'en',
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Roles retrieved successfully',
    type: RolesApiResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getRoles(
    @Headers('accept-language') acceptLanguage: string,
    @Request() req: any,
  ): Promise<RolesApiResponseDto> {
    const user = req.user;
    const roles = await this.usersService.getRoles(user.id, user.tenantId);

    const message = await this.i18nService.translate(
      MessageKeys.ROLES_RETRIEVED_SUCCESS,
      acceptLanguage,
    );

    return {
      code: MessageKeys.ROLES_RETRIEVED_SUCCESS,
      message: message.message,
      data: roles,
    };
  }

  @Get(':roleId/permissions')
  @ApiOperation({
    summary: 'Get role permissions',
    description: 'Retrieve permissions assigned to a specific role',
  })
  @ApiParam({
    name: 'roleId',
    description: 'Role ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiHeader({
    name: 'accept-language',
    required: true,
    description: 'Language preference (fa, ar, en)',
    schema: { type: 'string', enum: ['fa', 'ar', 'en'] },
  })
  @ApiResponse({
    status: 200,
    description: 'Role permissions retrieved successfully',
    type: RolePermissionsResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Role not found',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponse,
  })
  async getRolePermissions(
    @Param('roleId') roleId: string,
    @Headers('accept-language') acceptLanguage: string,
    @Request() req: any,
  ): Promise<RolePermissionsResponse> {
    const authenticatedUser: AuthenticatedUser = req.user;
    return this.permissionsService.getRolePermissions(
      roleId, 
      authenticatedUser, 
      acceptLanguage
    );
  }

  @Put(':roleId/permissions')
  @ApiOperation({
    summary: 'Update role permissions',
    description: 'Assign or revoke permissions for a specific role',
  })
  @ApiParam({
    name: 'roleId',
    description: 'Role ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiHeader({
    name: 'accept-language',
    required: true,
    description: 'Language preference (fa, ar, en)',
    schema: { type: 'string', enum: ['fa', 'ar', 'en'] },
  })
  @ApiResponse({
    status: 200,
    description: 'Role permissions updated successfully',
    type: UpdateRolePermissionsResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Role not found',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponse,
  })
  async updateRolePermissions(
    @Param('roleId') roleId: string,
    @Body() updateRequest: UpdateRolePermissionsRequest,
    @Request() req: any,
    @Headers('accept-language') acceptLanguage: string,
  ): Promise<UpdateRolePermissionsResponse> {
    const authenticatedUser: AuthenticatedUser = req.user;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    return this.permissionsService.updateRolePermissions(
      roleId,
      updateRequest,
      authenticatedUser,
      acceptLanguage,
      ipAddress,
      userAgent,
    );
  }
}
