import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '@/entities/role.entity';
import { Permission } from '@/entities/permission.entity';
import { RolePermission } from '@/entities/role-permission.entity';
import { Category } from '@/entities/category.entity';
import { InventoryItem } from '@/entities/inventory-item.entity';
import {
  RoleName,
  PermissionAction,
  Language,
  ItemType,
  AvailabilityStatus,
  InventoryItemStatus,
} from '@/common/enums';

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
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(InventoryItem)
    private inventoryItemRepository: Repository<InventoryItem>,
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
        actions: [PermissionAction.READ, PermissionAction.MANAGE],
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
        actions: [PermissionAction.READ, PermissionAction.EXPORT],
      },
      // Dashboard Permissions
      {
        resource: 'dashboard',
        actions: [PermissionAction.READ],
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
        actions: [PermissionAction.READ, PermissionAction.UPDATE],
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
            description: this.generatePermissionDescription(
              resourcePerm.resource,
              action,
            ),
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
  private generatePermissionDescription(
    resource: string,
    action: PermissionAction,
  ): string {
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
    this.logger.log(
      `Seeding role-permission relationships for tenant: ${tenantId}`,
    );

    // Define role-permission matrix based on ? business rules
    const rolePermissionMatrix = {
      [RoleName.TENANT_OWNER]: [
        // Full access to all tenant features and user management
        'users:create',
        'users:read',
        'users:update',
        'users:delete',
        'users:manage',
        'users:export',
        'users:import',
        'roles:create',
        'roles:read',
        'roles:update',
        'roles:manage',
        'permissions:read',
        'permissions:manage',
        'tenants:create',
        'tenants:read',
        'tenants:update',
        'tenants:delete',
        'tenants:manage',
        'audit:read',
        'audit:export',
        'dashboard:read',
        'sessions:read',
        'sessions:delete',
        'sessions:manage',
        'profile:read',
        'profile:update',
        'system:read',
        'system:update',
        'system:manage',
        'categories:create',
        'categories:read',
        'categories:update',
        'categories:delete',
        'categories:manage',
        'inventory:create',
        'inventory:read',
        'inventory:update',
        'inventory:delete',
        'inventory:manage',
        'inventory:export',
        'inventory:import',
      ],
      [RoleName.ADMIN]: [
        // Administrative access excluding Tenant Owner functions and other Admin management
        'users:create',
        'users:read',
        'users:update',
        'users:delete',
        'users:manage',
        'users:export',
        'roles:read',
        'roles:update',
        'roles:manage',
        'permissions:read',
        'tenants:read',
        'tenants:update',
        'audit:read',
        'audit:export',
        'dashboard:read',
        'sessions:read',
        'sessions:delete',
        'sessions:manage',
        'profile:read',
        'profile:update',
        'system:read',
        'system:update',
        'categories:create',
        'categories:read',
        'categories:update',
        'categories:delete',
        'categories:manage',
        'inventory:create',
        'inventory:read',
        'inventory:update',
        'inventory:delete',
        'inventory:manage',
        'inventory:export',
      ],
      [RoleName.MANAGER]: [
        // Operational access with limited administrative capabilities
        'users:create',
        'users:read',
        'users:update',
        'users:export',
        'roles:read',
        'permissions:read',
        'tenants:read',
        'audit:read',
        'dashboard:read',
        'sessions:read',
        'sessions:delete',
        'profile:read',
        'profile:update',
        'system:read',
        'categories:create',
        'categories:read',
        'categories:update',
        'categories:delete',
        'inventory:create',
        'inventory:read',
        'inventory:update',
        'inventory:delete',
        'inventory:export',
      ],
      [RoleName.EMPLOYEE]: [
        // Standard operational access without administrative functions
        'users:read',
        'roles:read',
        'permissions:read',
        'tenants:read',
        'dashboard:read',
        'sessions:read',
        'profile:read',
        'profile:update',
        'inventory:read',
        'inventory:update',
      ],
      [RoleName.STAFF]: [
        // Basic operational access with task-specific permissions
        'users:read',
        'dashboard:read',
        'sessions:read',
        'profile:read',
        'profile:update',
        'inventory:read',
      ],
    };

    // Get all roles and permissions from database
    const roles = await this.roleRepository.find();
    const permissions = await this.permissionRepository.find();

    // Create maps for quick lookup
    const roleMap = new Map(roles.map((role) => [role.name, role]));
    const permissionMap = new Map(
      permissions.map((permission) => [permission.name, permission]),
    );

    // Assign permissions to roles for this specific tenant
    for (const [roleName, permissionNames] of Object.entries(
      rolePermissionMatrix,
    )) {
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
        const existingRolePermission =
          await this.rolePermissionRepository.findOne({
            where: {
              roleId: role.id,
              permissionId: permission.id,
              tenantId: tenantId,
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
          this.logger.log(
            `Granted permission ${permissionName} to role ${roleName} for tenant ${tenantId}`,
          );
        } else {
          // Update existing relationship to ensure it's granted
          if (!existingRolePermission.isGranted) {
            existingRolePermission.isGranted = true;
            await this.rolePermissionRepository.save(existingRolePermission);
            this.logger.log(
              `Updated permission ${permissionName} for role ${roleName} in tenant ${tenantId} to granted`,
            );
          } else {
            this.logger.log(
              `Permission ${permissionName} already granted to role ${roleName} in tenant ${tenantId}`,
            );
          }
        }
      }
    }

    this.logger.log(
      `Finished seeding role-permission relationships for tenant: ${tenantId}`,
    );
  }

  /**
   * Seed default role-permission relationships
   * Implements role hierarchy from ? business rules
   * @deprecated Use seedTenantRolePermissions for new tenants
   */
  async seedRolePermissions(): Promise<void> {
    this.logger.log(
      'Legacy seeding method - role-permission relationships are now tenant-specific',
    );
    this.logger.log('Use seedTenantRolePermissions(tenantId) for new tenants');
    this.logger.log('Skipping global role-permission seeding');
  }

  /**
   * Seed default categories for a new tenant based on their language
   * Called when a new tenant is created
   */
  async seedTenantCategories(
    tenantId: string,
    language: Language,
  ): Promise<Category[]> {
    this.logger.log(
      `Seeding categories for tenant ${tenantId} in language: ${language}`,
    );

    const categories: Category[] = [];

    // Define categories based on language (5 categories as requested)
    let categoryData: Array<{ name: string; description: string }>;

    if (language === Language.PERSIAN) {
      categoryData = [
        {
          name: 'وسایل الکترونیکی',
          description: 'تجهیزات الکترونیکی و دیجیتال',
        },
        { name: 'مبلمان اداری', description: 'میز، صندلی و تجهیزات اداری' },
        { name: 'ابزار ساختمانی', description: 'ابزار و تجهیزات ساخت و ساز' },
        { name: 'وسایل نقلیه', description: 'خودرو، موتور و وسایل حمل و نقل' },
        {
          name: 'لوازم خانگی',
          description: 'یخچال، ماشین لباسشویی و سایر لوازم',
        },
      ];
    } else if (language === Language.ARABIC) {
      categoryData = [
        {
          name: 'الأجهزة الإلكترونية',
          description: 'المعدات الإلكترونية والرقمية',
        },
        {
          name: 'أثاث المكاتب',
          description: 'المكاتب والكراسي والمعدات المكتبية',
        },
        { name: 'أدوات البناء', description: 'أدوات ومعدات البناء والتشييد' },
        {
          name: 'وسائل النقل',
          description: 'السيارات والدراجات النارية ووسائل النقل',
        },
        {
          name: 'الأجهزة المنزلية',
          description: 'الثلاجات وغسالات الملابس وأجهزة أخرى',
        },
      ];
    } else {
      this.logger.warn(
        `Unsupported language: ${language}. Defaulting to Persian.`,
      );
      categoryData = [
        {
          name: 'وسایل الکترونیکی',
          description: 'تجهیزات الکترونیکی و دیجیتال',
        },
        { name: 'مبلمان اداری', description: 'میز، صندلی و تجهیزات اداری' },
        { name: 'ابزار ساختمانی', description: 'ابزار و تجهیزات ساخت و ساز' },
        { name: 'وسایل نقلیه', description: 'خودرو، موتور و وسایل حمل و نقل' },
        {
          name: 'لوازم خانگی',
          description: 'یخچال، ماشین لباسشویی و سایر لوازم',
        },
      ];
    }

    for (const catData of categoryData) {
      try {
        // Check if category already exists for this tenant
        const existingCategory = await this.categoryRepository.findOne({
          where: {
            tenantId: tenantId,
            name: catData.name,
          },
        });

        if (existingCategory) {
          this.logger.log(
            `Category already exists for tenant ${tenantId}: ${catData.name}`,
          );
          categories.push(existingCategory);
        } else {
          const category = this.categoryRepository.create({
            tenantId: tenantId,
            name: catData.name,
            description: catData.description,
          });
          const savedCategory = await this.categoryRepository.save(category);
          categories.push(savedCategory);
          this.logger.log(
            `Created category for tenant ${tenantId}: ${catData.name}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to create category ${catData.name} for tenant ${tenantId}`,
          error,
        );
        // Continue with other categories even if one fails
      }
    }

    this.logger.log(
      `Finished seeding ${categories.length} categories for tenant: ${tenantId}`,
    );
    return categories;
  }

  /**
   * Seed default inventory items for a new tenant based on their language
   * Called when a new tenant is created, after categories are seeded
   */
  async seedTenantInventoryItems(
    tenantId: string,
    language: Language,
    categories: Category[],
  ): Promise<void> {
    this.logger.log(
      `Seeding inventory items for tenant ${tenantId} in language: ${language}`,
    );

    if (categories.length === 0) {
      this.logger.warn(
        `No categories available for tenant ${tenantId}. Skipping inventory items seeding.`,
      );
      return;
    }

    // Define inventory items based on language (6 items per language = 12 total as requested)
    let itemsData: Array<{
      name: string;
      description: string;
      categoryKeyword: string;
      itemType: ItemType;
      serialNumber?: string;
      quantity?: number;
      availabilityStatus: AvailabilityStatus;
    }>;

    if (language === Language.PERSIAN) {
      itemsData = [
        {
          name: 'لپ تاپ ایسوس',
          description: 'لپ تاپ ایسوس مدل ROG با پردازنده i7',
          categoryKeyword: 'الکترونیکی',
          itemType: ItemType.SERIALIZED,
          serialNumber: 'ASUS-001-2024',
          availabilityStatus: AvailabilityStatus.AVAILABLE,
        },
        {
          name: 'تبلت سامسونگ',
          description: 'تبلت سامسونگ گلکسی تب A8',
          categoryKeyword: 'الکترونیکی',
          itemType: ItemType.SERIALIZED,
          serialNumber: 'SAMSUNG-TAB-001',
          availabilityStatus: AvailabilityStatus.AVAILABLE,
        },
        {
          name: 'میز اداری چوبی',
          description: 'میز اداری چوبی با کشو و قفل',
          categoryKeyword: 'مبلمان',
          itemType: ItemType.NON_SERIALIZED,
          quantity: 15,
          availabilityStatus: AvailabilityStatus.AVAILABLE,
        },
        {
          name: 'صندلی اداری چرخدار',
          description: 'صندلی اداری چرخدار با تنظیمات ارتفاع',
          categoryKeyword: 'مبلمان',
          itemType: ItemType.NON_SERIALIZED,
          quantity: 20,
          availabilityStatus: AvailabilityStatus.AVAILABLE,
        },
        {
          name: 'دریل برقی بوش',
          description: 'دریل برقی بوش مدل PSB 1800 LI-2',
          categoryKeyword: 'ساختمانی',
          itemType: ItemType.SERIALIZED,
          serialNumber: 'BOSCH-DRL-001',
          availabilityStatus: AvailabilityStatus.RENTED,
        },
        {
          name: 'یخچال ال جی',
          description: 'یخچال ال جی دوقلو 25 فوت',
          categoryKeyword: 'خانگی',
          itemType: ItemType.SERIALIZED,
          serialNumber: 'LG-REF-001',
          availabilityStatus: AvailabilityStatus.MAINTENANCE,
        },
      ];
    } else if (language === Language.ARABIC) {
      itemsData = [
        {
          name: 'حاسوب محمول HP',
          description: 'حاسوب محمول HP بمعالج Intel i5 وذاكرة 16GB',
          categoryKeyword: 'الإلكترونية',
          itemType: ItemType.SERIALIZED,
          serialNumber: 'HP-LAP-001-2024',
          availabilityStatus: AvailabilityStatus.AVAILABLE,
        },
        {
          name: 'طابعة كانون',
          description: 'طابعة كانون ليزر ملونة',
          categoryKeyword: 'الإلكترونية',
          itemType: ItemType.SERIALIZED,
          serialNumber: 'CANON-PRT-001',
          availabilityStatus: AvailabilityStatus.AVAILABLE,
        },
        {
          name: 'كرسي مكتب جلدي',
          description: 'كرسي مكتب جلدي قابل للتعديل',
          categoryKeyword: 'أثاث',
          itemType: ItemType.NON_SERIALIZED,
          quantity: 20,
          availabilityStatus: AvailabilityStatus.AVAILABLE,
        },
        {
          name: 'خزانة ملفات معدنية',
          description: 'خزانة ملفات معدنية بأربعة أدراج',
          categoryKeyword: 'أثاث',
          itemType: ItemType.NON_SERIALIZED,
          quantity: 10,
          availabilityStatus: AvailabilityStatus.AVAILABLE,
        },
        {
          name: 'مثقاب كهربائي ديوالت',
          description: 'مثقاب كهربائي ديوالت مع مجموعة لقم',
          categoryKeyword: 'البناء',
          itemType: ItemType.SERIALIZED,
          serialNumber: 'DEWALT-DRL-001',
          availabilityStatus: AvailabilityStatus.AVAILABLE,
        },
        {
          name: 'ثلاجة سامسونج',
          description: 'ثلاجة سامسونج بابين بسعة 500 لتر',
          categoryKeyword: 'المنزلية',
          itemType: ItemType.SERIALIZED,
          serialNumber: 'SAMSUNG-REF-001',
          availabilityStatus: AvailabilityStatus.DAMAGED,
        },
      ];
    } else {
      this.logger.warn(
        `Unsupported language: ${language}. Using Persian items as default.`,
      );
      itemsData = [
        {
          name: 'لپ تاپ ایسوس',
          description: 'لپ تاپ ایسوس مدل ROG با پردازنده i7',
          categoryKeyword: 'الکترونیکی',
          itemType: ItemType.SERIALIZED,
          serialNumber: 'ASUS-001-2024',
          availabilityStatus: AvailabilityStatus.AVAILABLE,
        },
        {
          name: 'تبلت سامسونگ',
          description: 'تبلت سامسونگ گلکسی تب A8',
          categoryKeyword: 'الکترونیکی',
          itemType: ItemType.SERIALIZED,
          serialNumber: 'SAMSUNG-TAB-001',
          availabilityStatus: AvailabilityStatus.AVAILABLE,
        },
        {
          name: 'میز اداری چوبی',
          description: 'میز اداری چوبی با کشو و قفل',
          categoryKeyword: 'مبلمان',
          itemType: ItemType.NON_SERIALIZED,
          quantity: 15,
          availabilityStatus: AvailabilityStatus.AVAILABLE,
        },
        {
          name: 'صندلی اداری چرخدار',
          description: 'صندلی اداری چرخدار با تنظیمات ارتفاع',
          categoryKeyword: 'مبلمان',
          itemType: ItemType.NON_SERIALIZED,
          quantity: 20,
          availabilityStatus: AvailabilityStatus.AVAILABLE,
        },
        {
          name: 'دریل برقی بوش',
          description: 'دریل برقی بوش مدل PSB 1800 LI-2',
          categoryKeyword: 'ساختمانی',
          itemType: ItemType.SERIALIZED,
          serialNumber: 'BOSCH-DRL-001',
          availabilityStatus: AvailabilityStatus.RENTED,
        },
        {
          name: 'یخچال ال جی',
          description: 'یخچال ال جی دوقلو 25 فوت',
          categoryKeyword: 'خانگی',
          itemType: ItemType.SERIALIZED,
          serialNumber: 'LG-REF-001',
          availabilityStatus: AvailabilityStatus.MAINTENANCE,
        },
      ];
    }

    let createdCount = 0;
    let skippedCount = 0;

    for (const itemData of itemsData) {
      try {
        // Find the appropriate category for this item
        const category = categories.find((c) =>
          c.name.includes(itemData.categoryKeyword),
        );
        if (!category) {
          this.logger.warn(
            `Category not found for item ${itemData.name} with keyword ${itemData.categoryKeyword}`,
          );
          skippedCount++;
          continue;
        }

        // Check if inventory item already exists
        const existingItem = await this.inventoryItemRepository.findOne({
          where: {
            name: itemData.name,
            tenant_id: tenantId,
          },
        });

        if (existingItem) {
          this.logger.log(
            `Inventory item already exists for tenant ${tenantId}: ${itemData.name}`,
          );
          skippedCount++;
          continue;
        }

        const inventoryItem = this.inventoryItemRepository.create({
          name: itemData.name,
          description: itemData.description,
          tenant_id: tenantId,
          category_id: category.id,
          item_type: itemData.itemType,
          serial_number: itemData.serialNumber || undefined,
          quantity: itemData.quantity || undefined,
          allocated_quantity: 0,
          availability_status: itemData.availabilityStatus,
          status: InventoryItemStatus.ACTIVE,
          version: 1,
          has_rental_history:
            itemData.availabilityStatus === AvailabilityStatus.RENTED,
          condition_notes:
            itemData.availabilityStatus === AvailabilityStatus.MAINTENANCE
              ? language === Language.PERSIAN
                ? 'در حال تعمیر و نگهداری'
                : 'قيد الصيانة والإصلاح'
              : itemData.availabilityStatus === AvailabilityStatus.DAMAGED
                ? language === Language.PERSIAN
                  ? 'نیاز به تعمیر'
                  : 'يحتاج إلى إصلاح'
                : language === Language.PERSIAN
                  ? 'وضعیت عادی'
                  : 'حالة طبيعية',
        });

        await this.inventoryItemRepository.save(inventoryItem);
        createdCount++;
        this.logger.log(
          `Created inventory item for tenant ${tenantId}: ${itemData.name}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to create inventory item ${itemData.name} for tenant ${tenantId}`,
          error,
        );
        skippedCount++;
        // Continue with other items even if one fails
      }
    }

    this.logger.log(
      `Finished seeding inventory items for tenant ${tenantId}. Created: ${createdCount}, Skipped: ${skippedCount}`,
    );
  }
}
