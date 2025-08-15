import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '@/entities/role.entity';
import { Permission } from '@/entities/permission.entity';
import { RolePermission } from '@/entities/role-permission.entity';
import { Category } from '@/entities/category.entity';
import { InventoryItem } from '@/entities/inventory-item.entity';
import { RoleName, PermissionAction, Language, ItemType, AvailabilityStatus, InventoryItemStatus } from '@/common/enums';

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

  /**
   * Seed sample categories for new tenant
   */
  async seedSampleCategories(tenantId: string, language: Language): Promise<Category[]> {
    this.logger.log(`Seeding sample categories for tenant: ${tenantId}, language: ${language}`);

    const categoryData = language === Language.PERSIAN ? {
      categories: [
        { name: 'الکترونیک', description: 'تجهیزات الکترونیک و دیجیتال' },
        { name: 'مبلمان', description: 'میز، صندلی و دیگر مبلمان اداری' },
        { name: 'ابزار کار', description: 'ابزارآلات و تجهیزات کاری' },
        { name: 'وسایل نقلیه', description: 'خودرو، موتورسیکلت و دوچرخه' },
        { name: 'تجهیزات ورزشی', description: 'وسایل ورزشی و تفریحی' },
      ]
    } : language === Language.ARABIC ? {
      categories: [
        { name: 'الإلكترونيات', description: 'الأجهزة الإلكترونية والرقمية' },
        { name: 'الأثاث', description: 'الطاولات والكراسي وأثاث المكاتب الأخرى' },
        { name: 'أدوات العمل', description: 'الأدوات والمعدات المهنية' },
        { name: 'المركبات', description: 'السيارات والدراجات النارية والدراجات الهوائية' },
        { name: 'المعدات الرياضية', description: 'المعدات الرياضية والترفيهية' },
      ]
    } : {
      // Default English fallback
      categories: [
        { name: 'Electronics', description: 'Electronic and digital equipment' },
        { name: 'Furniture', description: 'Tables, chairs, and other office furniture' },
        { name: 'Work Tools', description: 'Professional tools and equipment' },
        { name: 'Vehicles', description: 'Cars, motorcycles, and bicycles' },
        { name: 'Sports Equipment', description: 'Sports and recreational equipment' },
      ]
    };

    const createdCategories: Category[] = [];

    for (const catData of categoryData.categories) {
      // Check if category already exists
      const existingCategory = await this.categoryRepository.findOne({
        where: { tenantId: tenantId, name: catData.name },
      });

      if (!existingCategory) {
        const category = this.categoryRepository.create({
          tenantId: tenantId,
          name: catData.name,
          description: catData.description,
        });

        const savedCategory = await this.categoryRepository.save(category);
        createdCategories.push(savedCategory);
        this.logger.log(`Created category: ${catData.name} for tenant ${tenantId}`);
      } else {
        createdCategories.push(existingCategory);
        this.logger.log(`Category already exists: ${catData.name} for tenant ${tenantId}`);
      }
    }

    return createdCategories;
  }

  /**
   * Seed sample inventory items for new tenant
   */
  async seedSampleInventoryItems(tenantId: string, language: Language, categories: Category[]): Promise<void> {
    this.logger.log(`Seeding sample inventory items for tenant: ${tenantId}, language: ${language}`);

    const inventoryData = language === Language.PERSIAN ? {
      items: [
        // Electronics Category
        { name: 'لپتاپ دل XPS 13', description: 'لپتاپ قابل حمل با نمایشگر 13 اینچی', categoryIndex: 0, itemType: ItemType.SERIALIZED, serialNumber: 'LAPTOP001', availabilityStatus: AvailabilityStatus.RENTED, status: InventoryItemStatus.ARCHIVED },
        { name: 'پرینتر لیزری HP', description: 'پرینتر لیزری رنگی برای اداره', categoryIndex: 0, itemType: ItemType.SERIALIZED, serialNumber: 'PRINTER001', availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.ACTIVE },
        // Furniture Category  
        { name: 'میز اداری چوبی', description: 'میز اداری با کشو', categoryIndex: 1, itemType: ItemType.NON_SERIALIZED, quantity: 10, availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.ACTIVE, allocatedQuantity: 3, quantityUnit: 'عدد' },
        { name: 'صندلی اداری', description: 'صندلی اداری با چرخ', categoryIndex: 1, itemType: ItemType.NON_SERIALIZED, quantity: 15, availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.ACTIVE, allocatedQuantity: 5, quantityUnit: 'عدد' },
        { name: 'کتابخانه فلزی', description: 'قفسه کتاب فلزی 5 طبقه', categoryIndex: 1, itemType: ItemType.SERIALIZED, serialNumber: 'SHELF001', availabilityStatus: AvailabilityStatus.MAINTENANCE, status: InventoryItemStatus.ACTIVE },
        // Work Tools Category
        { name: 'دریل برقی', description: 'دریل برقی پیشرفته', categoryIndex: 2, itemType: ItemType.SERIALIZED, serialNumber: 'DRILL001', availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.ACTIVE },
        { name: 'جعبه ابزار', description: 'جعبه ابزار کامل', categoryIndex: 2, itemType: ItemType.NON_SERIALIZED, quantity: 5, availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.ACTIVE, allocatedQuantity: 1, quantityUnit: 'ست' },
        // Vehicles Category
        { name: 'دوچرخه کوهستان', description: 'دوچرخه کوهستان 21 دنده', categoryIndex: 3, itemType: ItemType.SERIALIZED, serialNumber: 'BIKE001', availabilityStatus: AvailabilityStatus.DAMAGED, status: InventoryItemStatus.ACTIVE },
        { name: 'اسکوتر برقی', description: 'اسکوتر برقی قابل حمل', categoryIndex: 3, itemType: ItemType.SERIALIZED, serialNumber: 'SCOOTER001', availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.ACTIVE },
        // Sports Equipment Category
        { name: 'توپ فوتبال', description: 'توپ فوتبال حرفه‌ای', categoryIndex: 4, itemType: ItemType.NON_SERIALIZED, quantity: 8, availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.ACTIVE, allocatedQuantity: 2, quantityUnit: 'عدد' },
        { name: 'راکت تنیس', description: 'راکت تنیس کربن', categoryIndex: 4, itemType: ItemType.SERIALIZED, serialNumber: 'RACKET001', availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.INACTIVE },
        { name: 'دمبل قابل تنظیم', description: 'دمبل با وزن قابل تنظیم', categoryIndex: 4, itemType: ItemType.NON_SERIALIZED, quantity: 3, availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.ARCHIVED, allocatedQuantity: 0, quantityUnit: 'جفت' },
      ]
    } : language === Language.ARABIC ? {
      items: [
        // Electronics Category
        { name: 'لابتوب ديل XPS 13', description: 'لابتوب محمول بشاشة 13 بوصة', categoryIndex: 0, itemType: ItemType.SERIALIZED, serialNumber: 'LAPTOP001', availabilityStatus: AvailabilityStatus.RENTED, status: InventoryItemStatus.ARCHIVED },
        { name: 'طابعة ليزر HP', description: 'طابعة ليزر ملونة للمكتب', categoryIndex: 0, itemType: ItemType.SERIALIZED, serialNumber: 'PRINTER001', availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.ACTIVE },
        // Furniture Category
        { name: 'مكتب خشبي', description: 'مكتب مكتبي مع أدراج', categoryIndex: 1, itemType: ItemType.NON_SERIALIZED, quantity: 10, availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.ACTIVE, allocatedQuantity: 3, quantityUnit: 'قطعة' },
        { name: 'كرسي مكتب', description: 'كرسي مكتب بعجلات', categoryIndex: 1, itemType: ItemType.NON_SERIALIZED, quantity: 15, availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.ACTIVE, allocatedQuantity: 5, quantityUnit: 'قطعة' },
        { name: 'خزانة معدنية', description: 'رف كتب معدني 5 طوابق', categoryIndex: 1, itemType: ItemType.SERIALIZED, serialNumber: 'SHELF001', availabilityStatus: AvailabilityStatus.MAINTENANCE, status: InventoryItemStatus.ACTIVE },
        // Work Tools Category
        { name: 'مثقاب كهربائي', description: 'مثقاب كهربائي متطور', categoryIndex: 2, itemType: ItemType.SERIALIZED, serialNumber: 'DRILL001', availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.ACTIVE },
        { name: 'صندوق عدة', description: 'صندوق عدة كامل', categoryIndex: 2, itemType: ItemType.NON_SERIALIZED, quantity: 5, availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.ACTIVE, allocatedQuantity: 1, quantityUnit: 'مجموعة' },
        // Vehicles Category
        { name: 'دراجة جبلية', description: 'دراجة جبلية بـ 21 سرعة', categoryIndex: 3, itemType: ItemType.SERIALIZED, serialNumber: 'BIKE001', availabilityStatus: AvailabilityStatus.DAMAGED, status: InventoryItemStatus.ACTIVE },
        { name: 'سكوتر كهربائي', description: 'سكوتر كهربائي قابل للطي', categoryIndex: 3, itemType: ItemType.SERIALIZED, serialNumber: 'SCOOTER001', availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.ACTIVE },
        // Sports Equipment Category
        { name: 'كرة قدم', description: 'كرة قدم احترافية', categoryIndex: 4, itemType: ItemType.NON_SERIALIZED, quantity: 8, availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.ACTIVE, allocatedQuantity: 2, quantityUnit: 'قطعة' },
        { name: 'مضرب تنس', description: 'مضرب تنس من الكربون', categoryIndex: 4, itemType: ItemType.SERIALIZED, serialNumber: 'RACKET001', availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.INACTIVE },
        { name: 'دمبل قابل للتعديل', description: 'دمبل بوزن قابل للتعديل', categoryIndex: 4, itemType: ItemType.NON_SERIALIZED, quantity: 3, availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.ARCHIVED, allocatedQuantity: 0, quantityUnit: 'زوج' },
      ]
    } : {
      // Default English fallback
      items: [
        // Electronics Category
        { name: 'Dell XPS 13 Laptop', description: '13-inch portable laptop computer', categoryIndex: 0, itemType: ItemType.SERIALIZED, serialNumber: 'LAPTOP001', availabilityStatus: AvailabilityStatus.RENTED, status: InventoryItemStatus.ARCHIVED },
        { name: 'HP Laser Printer', description: 'Color laser printer for office use', categoryIndex: 0, itemType: ItemType.SERIALIZED, serialNumber: 'PRINTER001', availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.ACTIVE },
        // Furniture Category
        { name: 'Wooden Office Desk', description: 'Office desk with drawers', categoryIndex: 1, itemType: ItemType.NON_SERIALIZED, quantity: 10, availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.ACTIVE, allocatedQuantity: 3, quantityUnit: 'pieces' },
        { name: 'Office Chair', description: 'Office chair with wheels', categoryIndex: 1, itemType: ItemType.NON_SERIALIZED, quantity: 15, availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.ACTIVE, allocatedQuantity: 5, quantityUnit: 'pieces' },
        { name: 'Metal Bookshelf', description: '5-tier metal bookshelf', categoryIndex: 1, itemType: ItemType.SERIALIZED, serialNumber: 'SHELF001', availabilityStatus: AvailabilityStatus.MAINTENANCE, status: InventoryItemStatus.ACTIVE },
        // Work Tools Category
        { name: 'Electric Drill', description: 'Advanced electric drill', categoryIndex: 2, itemType: ItemType.SERIALIZED, serialNumber: 'DRILL001', availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.ACTIVE },
        { name: 'Tool Box', description: 'Complete tool box set', categoryIndex: 2, itemType: ItemType.NON_SERIALIZED, quantity: 5, availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.ACTIVE, allocatedQuantity: 1, quantityUnit: 'sets' },
        // Vehicles Category
        { name: 'Mountain Bike', description: '21-speed mountain bicycle', categoryIndex: 3, itemType: ItemType.SERIALIZED, serialNumber: 'BIKE001', availabilityStatus: AvailabilityStatus.DAMAGED, status: InventoryItemStatus.ACTIVE },
        { name: 'Electric Scooter', description: 'Foldable electric scooter', categoryIndex: 3, itemType: ItemType.SERIALIZED, serialNumber: 'SCOOTER001', availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.ACTIVE },
        // Sports Equipment Category
        { name: 'Soccer Ball', description: 'Professional soccer ball', categoryIndex: 4, itemType: ItemType.NON_SERIALIZED, quantity: 8, availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.ACTIVE, allocatedQuantity: 2, quantityUnit: 'pieces' },
        { name: 'Tennis Racket', description: 'Carbon fiber tennis racket', categoryIndex: 4, itemType: ItemType.SERIALIZED, serialNumber: 'RACKET001', availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.INACTIVE },
        { name: 'Adjustable Dumbbell', description: 'Adjustable weight dumbbell', categoryIndex: 4, itemType: ItemType.NON_SERIALIZED, quantity: 3, availabilityStatus: AvailabilityStatus.AVAILABLE, status: InventoryItemStatus.ARCHIVED, allocatedQuantity: 0, quantityUnit: 'pairs' },
      ]
    };

    for (const itemData of inventoryData.items) {
      const category = categories[itemData.categoryIndex];
      if (!category) {
        this.logger.warn(`Category not found at index ${itemData.categoryIndex}`);
        continue;
      }

      // Check if inventory item already exists
      const existingItem = await this.inventoryItemRepository.findOne({
        where: { tenant_id: tenantId, name: itemData.name },
      });

      if (!existingItem) {
        const inventoryItem = this.inventoryItemRepository.create({
          name: itemData.name,
          description: itemData.description,
          tenant_id: tenantId,
          category_id: category.id,
          item_type: itemData.itemType,
          serial_number: itemData.itemType === ItemType.SERIALIZED ? itemData.serialNumber : undefined,
          serial_number_source: itemData.itemType === ItemType.SERIALIZED ? 'manual' : undefined,
          quantity: itemData.itemType === ItemType.NON_SERIALIZED ? itemData.quantity : undefined,
          allocated_quantity: itemData.allocatedQuantity || 0,
          quantity_unit: itemData.itemType === ItemType.NON_SERIALIZED ? (itemData.quantityUnit || 'pieces') : undefined,
          availability_status: itemData.availabilityStatus || AvailabilityStatus.AVAILABLE,
          status: itemData.status || InventoryItemStatus.ACTIVE,
          version: 1,
          has_rental_history: (itemData.availabilityStatus === AvailabilityStatus.RENTED || (itemData.allocatedQuantity && itemData.allocatedQuantity > 0)),
        } as Partial<InventoryItem>);

        await this.inventoryItemRepository.save(inventoryItem);
        this.logger.log(`Created inventory item: ${itemData.name} for tenant ${tenantId}`);
      } else {
        this.logger.log(`Inventory item already exists: ${itemData.name} for tenant ${tenantId}`);
      }
    }

    this.logger.log(`Finished seeding sample inventory items for tenant: ${tenantId}`);
  }

  /**
   * Seed sample data for new tenant owner
   * Creates categories and inventory items based on user language
   */
  async seedSampleDataForTenant(tenantId: string, language: Language): Promise<void> {
    this.logger.log(`Starting sample data seeding for tenant: ${tenantId}, language: ${language}`);

    try {
      // First, seed the categories
      const categories = await this.seedSampleCategories(tenantId, language);
      
      // Then, seed the inventory items using the created categories
      await this.seedSampleInventoryItems(tenantId, language, categories);

      this.logger.log(`Successfully completed sample data seeding for tenant: ${tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to seed sample data for tenant ${tenantId}`, error);
      throw error;
    }
  }
}
