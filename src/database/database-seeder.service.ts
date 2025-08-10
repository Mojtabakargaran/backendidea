import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '@/entities/role.entity';
import { Permission } from '@/entities/permission.entity';
import { RolePermission } from '@/entities/role-permission.entity';
import { RoleName, PermissionAction } from '@/common/enums';

/**
 * Database Seeder Service
 * Initializes default system roles
 * Required for ? tenant owner role assignment
 */
@Injectable()
export class DatabaseSeederService {
  private readonly logger = new Logger(DatabaseSeederService.name);

  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>,
  ) {}

  /**
   * Seed default system roles
   * Called during application startup
   */
  async seedRoles(): Promise<void> {
    this.logger.log('Seeding default system roles...');

    const defaultRoles = [
      {
        name: RoleName.TENANT_OWNER,
        description:
          'Tenant Owner with full administrative privileges within the tenant',
        isSystemRole: true,
        isActive: true,
      },
      {
        name: RoleName.ADMIN,
        description:
          'Administrator with comprehensive system access within the tenant',
        isSystemRole: true,
        isActive: true,
      },
      {
        name: RoleName.MANAGER,
        description: 'Manager with operational and supervisory privileges',
        isSystemRole: true,
        isActive: true,
      },
      {
        name: RoleName.EMPLOYEE,
        description: 'Employee with standard operational access',
        isSystemRole: true,
        isActive: true,
      },
      {
        name: RoleName.STAFF,
        description: 'Staff with limited operational access for specific tasks',
        isSystemRole: true,
        isActive: true,
      },
    ];

    for (const roleData of defaultRoles) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: roleData.name },
      });

      if (!existingRole) {
        const role = this.roleRepository.create(roleData);
        await this.roleRepository.save(role);
        this.logger.log(`Created role: ${roleData.name}`);
      } else {
        this.logger.log(`Role already exists: ${roleData.name}`);
      }
    }

    this.logger.log('Finished seeding default system roles');
  }

  /**
   * Seed default system permissions
   * Called during application startup
   */
  async seedPermissions(): Promise<void> {
    this.logger.log('Seeding default system permissions...');

    // Define system resources and their applicable actions
    const resourcePermissions = [
      // User Management Permissions
      {
        resource: 'users',
        actions: [
          PermissionAction.CREATE,
          PermissionAction.READ,
          PermissionAction.UPDATE,
          PermissionAction.DELETE,
          PermissionAction.MANAGE,
          PermissionAction.EXPORT,
          PermissionAction.IMPORT,
        ],
      },
      // Role Management Permissions
      {
        resource: 'roles',
        actions: [
          PermissionAction.CREATE,
          PermissionAction.READ,
          PermissionAction.UPDATE,
          PermissionAction.MANAGE,
        ],
      },
      // Permission Management Permissions
      {
        resource: 'permissions',
        actions: [
          PermissionAction.READ,
          PermissionAction.MANAGE,
        ],
      },
      // Tenant Management Permissions
      {
        resource: 'tenants',
        actions: [
          PermissionAction.CREATE,
          PermissionAction.READ,
          PermissionAction.UPDATE,
          PermissionAction.DELETE,
          PermissionAction.MANAGE,
        ],
      },
      // Audit Trail Permissions
      {
        resource: 'audit',
        actions: [
          PermissionAction.READ,
          PermissionAction.EXPORT,
        ],
      },
      // Dashboard Permissions
      {
        resource: 'dashboard',
        actions: [
          PermissionAction.READ,
        ],
      },
      // Session Management Permissions
      {
        resource: 'sessions',
        actions: [
          PermissionAction.READ,
          PermissionAction.DELETE,
          PermissionAction.MANAGE,
        ],
      },
      // Profile Management Permissions
      {
        resource: 'profile',
        actions: [
          PermissionAction.READ,
          PermissionAction.UPDATE,
        ],
      },
      // System Configuration Permissions
      {
        resource: 'system',
        actions: [
          PermissionAction.READ,
          PermissionAction.UPDATE,
          PermissionAction.MANAGE,
        ],
      },
      // Category Management Permissions (?)
      {
        resource: 'categories',
        actions: [
          PermissionAction.CREATE,
          PermissionAction.READ,
          PermissionAction.UPDATE,
          PermissionAction.DELETE,
          PermissionAction.MANAGE,
        ],
      },
      // Inventory Management Permissions (?)
      {
        resource: 'inventory',
        actions: [
          PermissionAction.CREATE,
          PermissionAction.READ,
          PermissionAction.UPDATE,
          PermissionAction.DELETE,
          PermissionAction.MANAGE,
          PermissionAction.EXPORT,
          PermissionAction.IMPORT,
        ],
      },
    ];

    for (const resourcePerm of resourcePermissions) {
      for (const action of resourcePerm.actions) {
        const permissionName = `${resourcePerm.resource}:${action}`;
        
        const existingPermission = await this.permissionRepository.findOne({
          where: { name: permissionName },
        });

        if (!existingPermission) {
          const permission = this.permissionRepository.create({
            name: permissionName,
            resource: resourcePerm.resource,
            action: action,
            description: this.generatePermissionDescription(resourcePerm.resource, action),
            isSystemPermission: true,
            isActive: true,
          });

          await this.permissionRepository.save(permission);
          this.logger.log(`Created permission: ${permissionName}`);
        } else {
          this.logger.log(`Permission already exists: ${permissionName}`);
        }
      }
    }

    this.logger.log('Finished seeding default system permissions');
  }

  /**
   * Generate human-readable description for permissions
   */
  private generatePermissionDescription(resource: string, action: PermissionAction): string {
    const resourceLabels = {
      users: 'User Management',
      roles: 'Role Management',
      permissions: 'Permission Management',
      tenants: 'Tenant Management',
      audit: 'Audit Trail',
      dashboard: 'Dashboard',
      sessions: 'Session Management',
      profile: 'Profile Management',
      system: 'System Configuration',
      categories: 'Category Management',
      inventory: 'Inventory Management',
    };

    const actionLabels = {
      [PermissionAction.CREATE]: 'Create',
      [PermissionAction.READ]: 'View',
      [PermissionAction.UPDATE]: 'Update',
      [PermissionAction.DELETE]: 'Delete',
      [PermissionAction.MANAGE]: 'Full Management',
      [PermissionAction.EXPORT]: 'Export Data',
      [PermissionAction.IMPORT]: 'Import Data',
    };

    const resourceLabel = resourceLabels[resource] || resource;
    const actionLabel = actionLabels[action] || action;

    return `${actionLabel} ${resourceLabel}`;
  }

  /**
   * Run all seeders
   */
  async runSeeders(): Promise<void> {
    try {
      await this.seedRoles();
      await this.seedPermissions();
      await this.seedRolePermissions();
      this.logger.log('Database seeding completed successfully');
    } catch (error) {
      this.logger.error('Database seeding failed', error);
      throw error;
    }
  }

  /**
   * Seed default role-permission relationships for a specific tenant
   * Called when a new tenant is created
   */
  async seedTenantRolePermissions(tenantId: string): Promise<void> {
    this.logger.log(`Seeding role-permission relationships for tenant: ${tenantId}`);

    // Define role-permission matrix based on ? business rules
    const rolePermissionMatrix = {
      [RoleName.TENANT_OWNER]: [
        // Full access to all tenant features and user management
        'users:create', 'users:read', 'users:update', 'users:delete', 'users:manage', 'users:export', 'users:import',
        'roles:create', 'roles:read', 'roles:update', 'roles:manage',
        'permissions:read', 'permissions:manage',
        'tenants:create', 'tenants:read', 'tenants:update', 'tenants:delete', 'tenants:manage',
        'audit:read', 'audit:export',
        'dashboard:read',
        'sessions:read', 'sessions:delete', 'sessions:manage',
        'profile:read', 'profile:update',
        'system:read', 'system:update', 'system:manage',
        'categories:create', 'categories:read', 'categories:update', 'categories:delete', 'categories:manage',
        'inventory:create', 'inventory:read', 'inventory:update', 'inventory:delete', 'inventory:manage', 'inventory:export', 'inventory:import',
      ],
      [RoleName.ADMIN]: [
        // Administrative access excluding Tenant Owner functions and other Admin management
        'users:create', 'users:read', 'users:update', 'users:delete', 'users:manage', 'users:export',
        'roles:read', 'roles:update', 'roles:manage',
        'permissions:read',
        'tenants:read', 'tenants:update',
        'audit:read', 'audit:export',
        'dashboard:read',
        'sessions:read', 'sessions:delete', 'sessions:manage',
        'profile:read', 'profile:update',
        'system:read', 'system:update',
        'categories:create', 'categories:read', 'categories:update', 'categories:delete', 'categories:manage',
        'inventory:create', 'inventory:read', 'inventory:update', 'inventory:delete', 'inventory:manage', 'inventory:export',
      ],
      [RoleName.MANAGER]: [
        // Operational access with limited administrative capabilities
        'users:create', 'users:read', 'users:update', 'users:export',
        'roles:read',
        'permissions:read',
        'tenants:read',
        'audit:read',
        'dashboard:read',
        'sessions:read', 'sessions:delete',
        'profile:read', 'profile:update',
        'system:read',
        'categories:create', 'categories:read', 'categories:update', 'categories:delete',
        'inventory:create', 'inventory:read', 'inventory:update', 'inventory:delete', 'inventory:export',
      ],
      [RoleName.EMPLOYEE]: [
        // Standard operational access without administrative functions
        'users:read',
        'roles:read',
        'permissions:read',
        'tenants:read',
        'dashboard:read',
        'sessions:read',
        'profile:read', 'profile:update',
        'inventory:read', 'inventory:update',
      ],
      [RoleName.STAFF]: [
        // Basic operational access with task-specific permissions
        'users:read',
        'dashboard:read',
        'sessions:read',
        'profile:read', 'profile:update',
        'inventory:read',
      ],
    };

    // Get all roles and permissions from database
    const roles = await this.roleRepository.find();
    const permissions = await this.permissionRepository.find();

    // Create maps for quick lookup
    const roleMap = new Map(roles.map(role => [role.name, role]));
    const permissionMap = new Map(permissions.map(permission => [permission.name, permission]));

    // Assign permissions to roles for this specific tenant
    for (const [roleName, permissionNames] of Object.entries(rolePermissionMatrix)) {
      const role = roleMap.get(roleName as RoleName);
      if (!role) {
        this.logger.warn(`Role not found: ${roleName}`);
        continue;
      }

      for (const permissionName of permissionNames) {
        const permission = permissionMap.get(permissionName);
        if (!permission) {
          this.logger.warn(`Permission not found: ${permissionName}`);
          continue;
        }

        // Check if role-permission relationship already exists for this tenant
        const existingRolePermission = await this.rolePermissionRepository.findOne({
          where: { 
            roleId: role.id, 
            permissionId: permission.id,
            tenantId: tenantId
          },
        });

        if (!existingRolePermission) {
          const rolePermission = this.rolePermissionRepository.create({
            roleId: role.id,
            permissionId: permission.id,
            tenantId: tenantId,
            isGranted: true,
          });

          await this.rolePermissionRepository.save(rolePermission);
          this.logger.log(`Granted permission ${permissionName} to role ${roleName} for tenant ${tenantId}`);
        } else {
          // Update existing relationship to ensure it's granted
          if (!existingRolePermission.isGranted) {
            existingRolePermission.isGranted = true;
            await this.rolePermissionRepository.save(existingRolePermission);
            this.logger.log(`Updated permission ${permissionName} for role ${roleName} in tenant ${tenantId} to granted`);
          } else {
            this.logger.log(`Permission ${permissionName} already granted to role ${roleName} in tenant ${tenantId}`);
          }
        }
      }
    }

    this.logger.log(`Finished seeding role-permission relationships for tenant: ${tenantId}`);
  }

  /**
   * Seed default role-permission relationships
   * Implements role hierarchy from ? business rules
   * @deprecated Use seedTenantRolePermissions for new tenants
   */
  async seedRolePermissions(): Promise<void> {
    this.logger.log('Legacy seeding method - role-permission relationships are now tenant-specific');
    this.logger.log('Use seedTenantRolePermissions(tenantId) for new tenants');
    this.logger.log('Skipping global role-permission seeding');
  }
}
