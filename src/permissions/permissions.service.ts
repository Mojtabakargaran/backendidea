import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { PermissionCheck } from '../entities/permission-check.entity';
import { Role } from '../entities/role.entity';
import { UserRole } from '../entities/user-role.entity';
import { I18nService } from '../i18n/i18n.service';
import { MessageKeys } from '../common/message-keys';
import { PermissionAction, CheckResult, RoleName } from '../common/enums';
import { UpdateRolePermissionsRequest } from './dto/update-role-permissions.dto';
import { PermissionCheckRequest } from './dto/permission-check.dto';
import { PermissionAuditQuery } from './dto/permission-audit.dto';

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  roleName: RoleName;
}

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(PermissionCheck)
    private readonly permissionCheckRepository: Repository<PermissionCheck>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly i18nService: I18nService,
  ) {}

  /**
   * Retrieve all available system permissions
   */
  async getPermissions(language: string) {
    try {
      const permissions = await this.permissionRepository.find({
        where: { isActive: true },
        order: { resource: 'ASC', action: 'ASC' },
      });

      const permissionDtos = permissions.map((permission) => ({
        id: permission.id,
        name: permission.name,
        resource: permission.resource,
        action: permission.action,
        description: permission.description,
        isActive: permission.isActive,
      }));

      return {
        code: MessageKeys.PERMISSIONS_RETRIEVED_SUCCESS,
        message: this.i18nService.translate(
          MessageKeys.PERMISSIONS_RETRIEVED_SUCCESS,
          language,
        ).message,
        data: permissionDtos,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        code: MessageKeys.PERMISSIONS_RETRIEVAL_FAILED,
        message: this.i18nService.translate(
          MessageKeys.PERMISSIONS_RETRIEVAL_FAILED,
          language,
        ).message,
      });
    }
  }

  /**
   * Retrieve permissions assigned to a specific role within tenant context
   */
  async getRolePermissions(
    roleId: string, 
    authenticatedUser: AuthenticatedUser,
    language: string
  ) {
    try {
      // Find the role
      const role = await this.roleRepository.findOne({
        where: { id: roleId },
      });

      if (!role) {
        throw new NotFoundException({
          code: MessageKeys.ROLE_NOT_FOUND,
          message: this.i18nService.translate(
            MessageKeys.ROLE_NOT_FOUND,
            language,
          ).message,
        });
      }

      // Get all permissions with their role assignments for this tenant
      const allPermissions = await this.permissionRepository.find({
        where: { isActive: true },
        order: { resource: 'ASC', action: 'ASC' },
      });

      const rolePermissions = await this.rolePermissionRepository.find({
        where: { 
          roleId,
          tenantId: authenticatedUser.tenantId 
        },
        relations: ['permission'],
      });

      const rolePermissionMap = new Map();
      rolePermissions.forEach((rp) => {
        rolePermissionMap.set(rp.permissionId, rp.isGranted);
      });

      const permissionDtos = allPermissions.map((permission) => ({
        permissionId: permission.id,
        name: permission.name,
        resource: permission.resource,
        action: permission.action,
        isGranted: rolePermissionMap.get(permission.id) || false,
      }));

      return {
        code: MessageKeys.ROLE_PERMISSIONS_RETRIEVED_SUCCESS,
        message: this.i18nService.translate(
          MessageKeys.ROLE_PERMISSIONS_RETRIEVED_SUCCESS,
          language,
        ).message,
        data: {
          roleId: role.id,
          roleName: role.name,
          permissions: permissionDtos,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException({
        code: MessageKeys.ROLE_PERMISSIONS_RETRIEVAL_FAILED,
        message: this.i18nService.translate(
          MessageKeys.ROLE_PERMISSIONS_RETRIEVAL_FAILED,
          language,
        ).message,
      });
    }
  }

  /**
   * Update permissions for a specific role
   */
  async updateRolePermissions(
    roleId: string,
    updateRequest: UpdateRolePermissionsRequest,
    authenticatedUser: AuthenticatedUser,
    language: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      // Verify role exists
      const role = await this.roleRepository.findOne({
        where: { id: roleId },
      });

      if (!role) {
        throw new NotFoundException({
          code: MessageKeys.ROLE_NOT_FOUND,
          message: this.i18nService.translate(
            MessageKeys.ROLE_NOT_FOUND,
            language,
          ).message,
        });
      }

      // Only tenant owners and admins can update role permissions
      if (
        ![RoleName.TENANT_OWNER, RoleName.ADMIN].includes(
          authenticatedUser.roleName,
        )
      ) {
        throw new ForbiddenException({
          code: MessageKeys.INSUFFICIENT_ROLE_PRIVILEGES,
          message: this.i18nService.translate(
            MessageKeys.INSUFFICIENT_ROLE_PRIVILEGES,
            language,
          ).message,
        });
      }

      // Admins cannot modify permissions for Tenant Owner or other Admin roles
      if (
        authenticatedUser.roleName === RoleName.ADMIN &&
        [RoleName.TENANT_OWNER, RoleName.ADMIN].includes(role.name as RoleName)
      ) {
        throw new ForbiddenException({
          code: MessageKeys.INSUFFICIENT_ROLE_PRIVILEGES,
          message: this.i18nService.translate(
            MessageKeys.INSUFFICIENT_ROLE_PRIVILEGES,
            language,
          ).message,
        });
      }

      // Validate permission IDs
      const permissionIds = updateRequest.permissions.map(
        (p) => p.permissionId,
      );
      const existingPermissions =
        await this.permissionRepository.findByIds(permissionIds);

      if (existingPermissions.length !== permissionIds.length) {
        throw new BadRequestException({
          code: MessageKeys.PERMISSION_NOT_FOUND,
          message: this.i18nService.translate(
            MessageKeys.PERMISSION_NOT_FOUND,
            language,
          ).message,
        });
      }

      let updatedCount = 0;

      // Update each permission within tenant context
      for (const permissionUpdate of updateRequest.permissions) {
        const existingRolePermission =
          await this.rolePermissionRepository.findOne({
            where: {
              roleId,
              permissionId: permissionUpdate.permissionId,
              tenantId: authenticatedUser.tenantId,
            },
          });

        if (existingRolePermission) {
          // Update existing permission
          if (existingRolePermission.isGranted !== permissionUpdate.isGranted) {
            existingRolePermission.isGranted = permissionUpdate.isGranted;
            await this.rolePermissionRepository.save(existingRolePermission);
            updatedCount++;
          }
        } else {
          // Create new role permission for this tenant
          const newRolePermission = this.rolePermissionRepository.create({
            roleId,
            permissionId: permissionUpdate.permissionId,
            tenantId: authenticatedUser.tenantId,
            isGranted: permissionUpdate.isGranted,
          });
          await this.rolePermissionRepository.save(newRolePermission);
          updatedCount++;
        }
      }

      return {
        code: MessageKeys.ROLE_PERMISSIONS_UPDATED_SUCCESS,
        message: this.i18nService.translate(
          MessageKeys.ROLE_PERMISSIONS_UPDATED_SUCCESS,
          language,
        ).message,
        data: {
          roleId,
          updatedPermissions: updatedCount,
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException({
        code: MessageKeys.ROLE_PERMISSIONS_UPDATE_FAILED,
        message: this.i18nService.translate(
          MessageKeys.ROLE_PERMISSIONS_UPDATE_FAILED,
          language,
        ).message,
      });
    }
  }

  /**
   * Check if current user has specific permission
   */
  async checkPermission(
    checkRequest: PermissionCheckRequest,
    authenticatedUser: AuthenticatedUser,
    language: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      const permissionName = `${checkRequest.resource}:${checkRequest.action}`;

      // Find the permission
      const permission = await this.permissionRepository.findOne({
        where: {
          resource: checkRequest.resource,
          action: checkRequest.action,
          isActive: true,
        },
      });

      if (!permission) {
        await this.logPermissionCheck(
          authenticatedUser,
          null,
          CheckResult.DENIED,
          'Permission not found',
          checkRequest.resourceContext,
          ipAddress,
          userAgent,
        );

        return {
          code: MessageKeys.PERMISSION_CHECK_COMPLETED,
          message: this.i18nService.translate(
            MessageKeys.PERMISSION_CHECK_COMPLETED,
            language,
          ).message,
          data: {
            checkResult: CheckResult.DENIED,
            permissionName,
            denialReason: this.i18nService.translate(
              MessageKeys.PERMISSION_NOT_FOUND,
              language,
            ).message,
          },
        };
      }

      // Get user's role
      const userRole = await this.userRoleRepository.findOne({
        where: {
          userId: authenticatedUser.id,
          tenantId: authenticatedUser.tenantId,
          isActive: true,
        },
        relations: ['role'],
      });

      if (!userRole) {
        await this.logPermissionCheck(
          authenticatedUser,
          permission.id,
          CheckResult.DENIED,
          'User role not found',
          checkRequest.resourceContext,
          ipAddress,
          userAgent,
        );

        return {
          code: MessageKeys.PERMISSION_CHECK_COMPLETED,
          message: this.i18nService.translate(
            MessageKeys.PERMISSION_CHECK_COMPLETED,
            language,
          ).message,
          data: {
            checkResult: CheckResult.DENIED,
            permissionName,
            denialReason: this.i18nService.translate(
              MessageKeys.INSUFFICIENT_ROLE_PRIVILEGES,
              language,
            ).message,
          },
        };
      }

      // Check role permission within tenant context
      const rolePermission = await this.rolePermissionRepository.findOne({
        where: {
          roleId: userRole.roleId,
          permissionId: permission.id,
          tenantId: authenticatedUser.tenantId,
          isGranted: true,
        },
      });

      const isGranted = !!rolePermission;
      const checkResult = isGranted ? CheckResult.GRANTED : CheckResult.DENIED;
      const denialReason = isGranted
        ? undefined
        : this.i18nService.translate(
            MessageKeys.INSUFFICIENT_ROLE_PRIVILEGES,
            language,
          ).message;

      // Log the permission check
      await this.logPermissionCheck(
        authenticatedUser,
        permission.id,
        checkResult,
        denialReason,
        checkRequest.resourceContext,
        ipAddress,
        userAgent,
      );

      return {
        code: MessageKeys.PERMISSION_CHECK_COMPLETED,
        message: this.i18nService.translate(
          MessageKeys.PERMISSION_CHECK_COMPLETED,
          language,
        ).message,
        data: {
          checkResult,
          permissionName,
          denialReason,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException({
        code: MessageKeys.PERMISSION_CHECK_FAILED,
        message: this.i18nService.translate(
          MessageKeys.PERMISSION_CHECK_FAILED,
          language,
        ).message,
      });
    }
  }

  /**
   * Retrieve permission audit logs
   */
  async getPermissionAudit(
    query: PermissionAuditQuery,
    authenticatedUser: AuthenticatedUser,
    language: string,
  ) {
    try {
      // Only tenant owners and admins can view permission audit logs
      if (
        ![RoleName.TENANT_OWNER, RoleName.ADMIN].includes(
          authenticatedUser.roleName,
        )
      ) {
        throw new ForbiddenException({
          code: MessageKeys.AUDIT_ACCESS_DENIED,
          message: this.i18nService.translate(
            MessageKeys.AUDIT_ACCESS_DENIED,
            language,
          ).message,
        });
      }

      const {
        page = 1,
        limit = 20,
        userId,
        permissionId,
        checkResult,
        dateFrom,
        dateTo,
      } = query;
      const skip = (page - 1) * limit;

      // Build query conditions
      const whereConditions: any = {
        tenantId: authenticatedUser.tenantId,
      };

      if (userId) {
        whereConditions.userId = userId;
      }

      if (permissionId) {
        whereConditions.permissionId = permissionId;
      }

      if (checkResult) {
        whereConditions.checkResult = checkResult;
      }

      if (dateFrom || dateTo) {
        whereConditions.createdAt = {};
        if (dateFrom) {
          whereConditions.createdAt.gte = new Date(dateFrom);
        }
        if (dateTo) {
          whereConditions.createdAt.lte = new Date(dateTo);
        }
      }

      // Get total count and records
      const [logs, total] = await this.permissionCheckRepository.findAndCount({
        where: whereConditions,
        relations: ['user', 'permission'],
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
      });

      const logDtos = logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        userFullName: log.user.fullName,
        permissionName: log.permission.name,
        resource: log.permission.resource,
        action: log.permission.action,
        checkResult: log.checkResult,
        denialReason: log.denialReason,
        resourceContext: log.resourceContext,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toISOString(),
      }));

      const totalPages = Math.ceil(total / limit);

      return {
        code: MessageKeys.PERMISSION_AUDIT_RETRIEVED_SUCCESS,
        message: this.i18nService.translate(
          MessageKeys.PERMISSION_AUDIT_RETRIEVED_SUCCESS,
          language,
        ).message,
        data: {
          logs: logDtos,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        },
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException({
        code: MessageKeys.PERMISSION_AUDIT_RETRIEVAL_FAILED,
        message: this.i18nService.translate(
          MessageKeys.PERMISSION_AUDIT_RETRIEVAL_FAILED,
          language,
        ).message,
      });
    }
  }

  /**
   * Log permission check for audit purposes
   */
  private async logPermissionCheck(
    user: AuthenticatedUser,
    permissionId: string | null,
    checkResult: CheckResult,
    denialReason?: string,
    resourceContext?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      if (!permissionId) return; // Skip logging if permission not found

      const permissionCheck = this.permissionCheckRepository.create({
        userId: user.id,
        tenantId: user.tenantId,
        permissionId,
        checkResult,
        denialReason,
        resourceContext,
        ipAddress,
        userAgent,
      });

      await this.permissionCheckRepository.save(permissionCheck);
    } catch (error) {
      // Log error but don't throw - permission checks should not fail due to logging issues
      console.error('Failed to log permission check:', error);
    }
  }

  /**
   * Get all permissions for a user based on their role within tenant context
   * This method returns all granted permissions for use in login response
   */
  async getUserPermissions(
    userId: string,
    tenantId: string,
  ): Promise<string[]> {
    try {
      // Get user's role
      const userRole = await this.userRoleRepository.findOne({
        where: {
          userId,
          tenantId,
          isActive: true,
        },
      });

      if (!userRole) {
        return [];
      }

      // Get all granted permissions for this role in this tenant
      const rolePermissions = await this.rolePermissionRepository.find({
        where: {
          roleId: userRole.roleId,
          tenantId,
          isGranted: true,
        },
        relations: ['permission'],
      });

      // Extract permission names and return them
      return rolePermissions
        .filter(rp => rp.permission && rp.permission.isActive)
        .map(rp => rp.permission.name);
    } catch (error) {
      // Return empty array on any error for security
      console.error('Failed to get user permissions:', error);
      return [];
    }
  }

  /**
   * Check if user has permission for specific resource and action
   * This is a utility method for use in guards and other services
   */
  async hasPermission(
    userId: string,
    tenantId: string,
    resource: string,
    action: PermissionAction,
  ): Promise<boolean> {
    try {
      // Find the permission
      const permission = await this.permissionRepository.findOne({
        where: {
          resource,
          action,
          isActive: true,
        },
      });

      if (!permission) {
        return false;
      }

      // Get user's role
      const userRole = await this.userRoleRepository.findOne({
        where: {
          userId,
          tenantId,
          isActive: true,
        },
      });

      if (!userRole) {
        return false;
      }

      // Check role permission
      const rolePermission = await this.rolePermissionRepository.findOne({
        where: {
          roleId: userRole.roleId,
          permissionId: permission.id,
          tenantId,
          isGranted: true,
        },
      });

      return !!rolePermission;
    } catch (error) {
      // Return false on any error for security
      return false;
    }
  }
}
