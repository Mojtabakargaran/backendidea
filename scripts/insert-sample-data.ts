#!/usr/bin/env ts-node

import * as dotenv from 'dotenv'; dotenv.config();
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

// Import entities
import { Tenant } from '../src/entities/tenant.entity';
import { User } from '../src/entities/user.entity';
import { Role } from '../src/entities/role.entity';
import { UserRole } from '../src/entities/user-role.entity';
import { Permission } from '../src/entities/permission.entity';
import { RolePermission } from '../src/entities/role-permission.entity';
import { Category } from '../src/entities/category.entity';
import { InventoryItem } from '../src/entities/inventory-item.entity';

// Import enums
import { 
  Language, 
  Locale, 
  TenantStatus, 
  UserStatus, 
  RoleName,
  ItemType,
  AvailabilityStatus,
  InventoryItemStatus
} from '../src/common/enums';

// Import database config
import { createTypeOrmConfig } from '../src/database/database.config';

/**
 * Sample Data Insertion Script for Samanin Rental App
 * This script inserts sample data in Persian and Arabic languages
 * 
 * Usage: npm run sample-data
 * Or: ts-node scripts/insert-sample-data.ts
 */
class SampleDataInserter {
  private dataSource: DataSource;

  constructor() {
    // Initialize ConfigService
    const configService = new ConfigService({
      DB_HOST: process.env.DB_HOST || 'localhost',
      DB_PORT: process.env.DB_PORT || '5432',
      DB_USERNAME: process.env.DB_USERNAME || 'postgres',
      DB_PASSWORD: process.env.DB_PASSWORD || (() => { throw new Error('DB_PASSWORD environment variable is required') })(),
      DB_DATABASE: process.env.DB_DATABASE || 'samanin_dev',
      NODE_ENV: process.env.NODE_ENV || 'development',
    });

    // Create TypeORM configuration
    const typeormConfig = createTypeOrmConfig(configService);
    
    this.dataSource = new DataSource({
      ...typeormConfig,
      synchronize: false, // Don't modify schema
      logging: true,
    });
  }

  async connect(): Promise<void> {
    try {
      await this.dataSource.initialize();
      console.log('✅ Database connection established');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
      console.log('✅ Database connection closed');
    }
  }

  /**
   * Insert sample tenants with Persian and Arabic companies
   */
  async insertSampleTenants(): Promise<{ persian: Tenant; arabic: Tenant }> {
    console.log('📦 Inserting sample tenants...');
    
    const tenantRepo = this.dataSource.getRepository(Tenant);

    // Check if Persian tenant already exists
    let persianTenant = await tenantRepo.findOne({
      where: { companyName: 'شرکت اجاره پارس' }
    });
    
    if (!persianTenant) {
      persianTenant = tenantRepo.create({
        companyName: 'شرکت اجاره پارس',
        language: Language.PERSIAN,
        locale: Locale.IRAN,
        status: TenantStatus.ACTIVE,
      });
      await tenantRepo.save(persianTenant);
      console.log(`✅ Persian tenant created: ${persianTenant.companyName}`);
    } else {
      console.log(`⚠️  Persian tenant already exists: ${persianTenant.companyName}`);
    }

    // Check if Arabic tenant already exists
    let arabicTenant = await tenantRepo.findOne({
      where: { companyName: 'شركة الإمارات للإيجار' }
    });
    
    if (!arabicTenant) {
      arabicTenant = tenantRepo.create({
        companyName: 'شركة الإمارات للإيجار',
        language: Language.ARABIC,
        locale: Locale.UAE,
        status: TenantStatus.ACTIVE,
      });
      await tenantRepo.save(arabicTenant);
      console.log(`✅ Arabic tenant created: ${arabicTenant.companyName}`);
    } else {
      console.log(`⚠️  Arabic tenant already exists: ${arabicTenant.companyName}`);
    }
    
    return { persian: persianTenant, arabic: arabicTenant };
  }

  /**
   * Insert default roles for both tenants
   */
  async insertDefaultRoles(): Promise<Role[]> {
    console.log('👥 Inserting default roles...');
    
    const roleRepo = this.dataSource.getRepository(Role);
    
    const roleNames = Object.values(RoleName);
    const roles: Role[] = [];
    const newRoles: Role[] = [];
    
    for (const roleName of roleNames) {
      // Check if role already exists
      const existingRole = await roleRepo.findOne({ where: { name: roleName } });
      
      if (existingRole) {
        console.log(`⚠️  Role already exists: ${roleName}`);
        roles.push(existingRole);
      } else {
        const role = roleRepo.create({
          name: roleName,
          description: this.getRoleDescription(roleName),
        });
        newRoles.push(role);
        roles.push(role);
      }
    }
    
    if (newRoles.length > 0) {
      await roleRepo.save(newRoles);
      console.log(`✅ Created ${newRoles.length} new roles`);
    } else {
      console.log('✅ All roles already exist, skipping creation');
    }
    
    return roles;
  }

  /**
   * Insert sample users for both tenants
   */
  async insertSampleUsers(tenants: { persian: Tenant; arabic: Tenant }, roles: Role[]): Promise<void> {
    console.log('👤 Inserting sample users...');
    
    const userRepo = this.dataSource.getRepository(User);
    const userRoleRepo = this.dataSource.getRepository(UserRole);
    
    const passwordHash = await bcrypt.hash('SamplePass123!', 12);
    
    // Persian users
    const persianUsers = [
      {
        fullName: 'علی احمدی',
        email: 'ali.ahmadi@parsi.com',
        phoneNumber: '+98912345678',
        tenant: tenants.persian,
        roleName: RoleName.TENANT_OWNER,
      },
      {
        fullName: 'زهرا محمدی',
        email: 'zahra.mohammadi@parsi.com',
        phoneNumber: '+98912345679',
        tenant: tenants.persian,
        roleName: RoleName.MANAGER,
      },
      {
        fullName: 'حسن رضایی',
        email: 'hassan.rezaei@parsi.com',
        phoneNumber: '+98912345680',
        tenant: tenants.persian,
        roleName: RoleName.EMPLOYEE,
      },
    ];

    // Arabic users
    const arabicUsers = [
      {
        fullName: 'أحمد السعدي',
        email: 'ahmed.alsaadi@emirates.ae',
        phoneNumber: '+971501234567',
        tenant: tenants.arabic,
        roleName: RoleName.TENANT_OWNER,
      },
      {
        fullName: 'فاطمة الزهراء',
        email: 'fatima.alzahra@emirates.ae',
        phoneNumber: '+971501234568',
        tenant: tenants.arabic,
        roleName: RoleName.ADMIN,
      },
      {
        fullName: 'محمد النور',
        email: 'mohamed.alnoor@emirates.ae',
        phoneNumber: '+971501234569',
        tenant: tenants.arabic,
        roleName: RoleName.STAFF,
      },
    ];

    const allUsers = [...persianUsers, ...arabicUsers];
    
    for (const userData of allUsers) {
      // Check if user already exists
      const existingUser = await userRepo.findOne({ 
        where: { email: userData.email } 
      });
      
      if (existingUser) {
        console.log(`⚠️  User already exists: ${userData.fullName} (${userData.email})`);
        continue;
      }
      
      // Create user
      const user = userRepo.create({
        tenantId: userData.tenant.id,
        fullName: userData.fullName,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        passwordHash,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      });
      
      await userRepo.save(user);
      
      // Assign role
      const role = roles.find(r => r.name === userData.roleName);
      if (role) {
        const userRole = userRoleRepo.create({
          userId: user.id,
          roleId: role.id,
          tenantId: userData.tenant.id,
        });
        await userRoleRepo.save(userRole);
      }
      
      console.log(`✅ User created: ${user.fullName} (${user.email})`);
    }
  }

  /**
   * Insert sample categories for both tenants
   */
  async insertSampleCategories(tenants: { persian: Tenant; arabic: Tenant }): Promise<{ persian: Category[]; arabic: Category[] }> {
    console.log('📂 Inserting sample categories...');
    
    const categoryRepo = this.dataSource.getRepository(Category);
    
    // Persian categories
    const persianCategoryData = [
      { name: 'وسایل الکترونیکی', description: 'تجهیزات الکترونیکی و دیجیتال' },
      { name: 'مبلمان اداری', description: 'میز، صندلی و تجهیزات اداری' },
      { name: 'ابزار ساختمانی', description: 'ابزار و تجهیزات ساخت و ساز' },
      { name: 'وسایل نقلیه', description: 'خودرو، موتور و وسایل حمل و نقل' },
      { name: 'تجهیزات پزشکی', description: 'دستگاه‌های پزشکی و بهداشتی' },
      { name: 'لوازم خانگی', description: 'یخچال، ماشین لباسشویی و سایر لوازم' },
    ];

    // Arabic categories  
    const arabicCategoryData = [
      { name: 'الأجهزة الإلكترونية', description: 'المعدات الإلكترونية والرقمية' },
      { name: 'أثاث المكاتب', description: 'المكاتب والكراسي والمعدات المكتبية' },
      { name: 'أدوات البناء', description: 'أدوات ومعدات البناء والتشييد' },
      { name: 'وسائل النقل', description: 'السيارات والدراجات النارية ووسائل النقل' },
      { name: 'المعدات الطبية', description: 'الأجهزة الطبية والصحية' },
      { name: 'الأجهزة المنزلية', description: 'الثلاجات وغسالات الملابس وأجهزة أخرى' },
    ];

    const persianCategories: Category[] = [];
    const arabicCategories: Category[] = [];

    // Create Persian categories
    for (const catData of persianCategoryData) {
      // Check if category already exists for this tenant
      const existingCategory = await categoryRepo.findOne({
        where: { 
          tenantId: tenants.persian.id,
          name: catData.name 
        }
      });
      
      if (existingCategory) {
        console.log(`⚠️  Persian category already exists: ${catData.name}`);
        persianCategories.push(existingCategory);
      } else {
        const category = categoryRepo.create({
          tenantId: tenants.persian.id,
          name: catData.name,
          description: catData.description,
        });
        await categoryRepo.save(category);
        persianCategories.push(category);
        console.log(`✅ Created Persian category: ${catData.name}`);
      }
    }

    // Create Arabic categories
    for (const catData of arabicCategoryData) {
      // Check if category already exists for this tenant
      const existingCategory = await categoryRepo.findOne({
        where: { 
          tenantId: tenants.arabic.id,
          name: catData.name 
        }
      });
      
      if (existingCategory) {
        console.log(`⚠️  Arabic category already exists: ${catData.name}`);
        arabicCategories.push(existingCategory);
      } else {
        const category = categoryRepo.create({
          tenantId: tenants.arabic.id,
          name: catData.name,
          description: catData.description,
        });
        await categoryRepo.save(category);
        arabicCategories.push(category);
        console.log(`✅ Created Arabic category: ${catData.name}`);
      }
    }
    
    return { persian: persianCategories, arabic: arabicCategories };
  }

  /**
   * Insert sample inventory items for both tenants
   */
  async insertSampleInventoryItems(
    tenants: { persian: Tenant; arabic: Tenant },
    categories: { persian: Category[]; arabic: Category[] }
  ): Promise<void> {
    console.log('📦 Inserting sample inventory items...');
    
    const inventoryRepo = this.dataSource.getRepository(InventoryItem);
    
    // Persian inventory items
    const persianItems = [
      {
        name: 'لپ تاپ ایسوس',
        description: 'لپ تاپ ایسوس مدل ROG با پردازنده i7',
        category: categories.persian.find(c => c.name.includes('الکترونیکی')),
        itemType: ItemType.SERIALIZED,
        serialNumber: 'ASUS-001-2024',
        availabilityStatus: AvailabilityStatus.AVAILABLE,
      },
      {
        name: 'میز اداری چوبی',
        description: 'میز اداری چوبی با کشو و قفل',
        category: categories.persian.find(c => c.name.includes('مبلمان')),
        itemType: ItemType.NON_SERIALIZED,
        quantity: 15,
        availabilityStatus: AvailabilityStatus.AVAILABLE,
      },
      {
        name: 'دریل برقی بوش',
        description: 'دریل برقی بوش مدل PSB 1800 LI-2',
        category: categories.persian.find(c => c.name.includes('ساختمانی')),
        itemType: ItemType.SERIALIZED,
        serialNumber: 'BOSCH-DRL-001',
        availabilityStatus: AvailabilityStatus.RENTED,
      },
      {
        name: 'یخچال ال جی',
        description: 'یخچال ال جی دوقلو 25 فوت',
        category: categories.persian.find(c => c.name.includes('خانگی')),
        itemType: ItemType.SERIALIZED,
        serialNumber: 'LG-REF-001',
        availabilityStatus: AvailabilityStatus.MAINTENANCE,
      },
    ];

    // Arabic inventory items
    const arabicItems = [
      {
        name: 'حاسوب محمول HP',
        description: 'حاسوب محمول HP بمعالج Intel i5 وذاكرة 16GB',
        category: categories.arabic.find(c => c.name.includes('الإلكترونية')),
        itemType: ItemType.SERIALIZED,
        serialNumber: 'HP-LAP-001-2024',
        availabilityStatus: AvailabilityStatus.AVAILABLE,
      },
      {
        name: 'كرسي مكتب جلدي',
        description: 'كرسي مكتب جلدي قابل للتعديل',
        category: categories.arabic.find(c => c.name.includes('أثاث')),
        itemType: ItemType.NON_SERIALIZED,
        quantity: 20,
        availabilityStatus: AvailabilityStatus.AVAILABLE,
      },
      {
        name: 'مثقاب كهربائي ديوالت',
        description: 'مثقاب كهربائي ديوالت مع مجموعة لقم',
        category: categories.arabic.find(c => c.name.includes('البناء')),
        itemType: ItemType.SERIALIZED,
        serialNumber: 'DEWALT-DRL-001',
        availabilityStatus: AvailabilityStatus.AVAILABLE,
      },
      {
        name: 'ثلاجة سامسونج',
        description: 'ثلاجة سامسونج بابين بسعة 500 لتر',
        category: categories.arabic.find(c => c.name.includes('المنزلية')),
        itemType: ItemType.SERIALIZED,
        serialNumber: 'SAMSUNG-REF-001',
        availabilityStatus: AvailabilityStatus.DAMAGED,
      },
    ];

    const allItems = [...persianItems, ...arabicItems];
    
    for (const itemData of allItems) {
      if (!itemData.category) {
        console.warn(`⚠️  Category not found for item: ${itemData.name}`);
        continue;
      }

      // Check if inventory item already exists
      const existingItem = await inventoryRepo.findOne({
        where: { 
          name: itemData.name,
          tenant_id: itemData.category.tenantId
        }
      });
      
      if (existingItem) {
        console.log(`⚠️  Inventory item already exists: ${itemData.name}`);
        continue;
      }

      const inventoryItem = new InventoryItem();
      inventoryItem.name = itemData.name;
      inventoryItem.description = itemData.description;
      inventoryItem.tenant_id = itemData.category.tenantId;
      inventoryItem.category_id = itemData.category.id;
      inventoryItem.item_type = itemData.itemType;
      inventoryItem.serial_number = itemData.serialNumber || undefined;
      inventoryItem.quantity = itemData.quantity || undefined;
      inventoryItem.allocated_quantity = 0;
      inventoryItem.availability_status = itemData.availabilityStatus;
      inventoryItem.status = InventoryItemStatus.ACTIVE;
      inventoryItem.version = 1;
      inventoryItem.has_rental_history = itemData.availabilityStatus === AvailabilityStatus.RENTED;
      inventoryItem.condition_notes = itemData.availabilityStatus === AvailabilityStatus.MAINTENANCE 
        ? 'در حال تعمیر و نگهداری' 
        : itemData.availabilityStatus === AvailabilityStatus.DAMAGED
        ? 'نیاز به تعمیر'
        : 'وضعیت عادی';
      
      await inventoryRepo.save(inventoryItem);
      console.log(`✅ Inventory item created: ${inventoryItem.name}`);
    }
  }

  /**
   * Seed role-permission relationships for specific tenants
   * Replicates the logic from DatabaseSeederService.seedTenantRolePermissions
   */
  async seedTenantRolePermissions(tenantId: string): Promise<void> {
    console.log(`🔐 Seeding role-permission relationships for tenant: ${tenantId}...`);

    const roleRepo = this.dataSource.getRepository(Role);
    const permissionRepo = this.dataSource.getRepository(Permission);
    const rolePermissionRepo = this.dataSource.getRepository(RolePermission);

    // Check if permissions exist (should be seeded during app startup)
    const permissions = await permissionRepo.find();
    if (permissions.length === 0) {
      console.warn('⚠️  No permissions found in database!');
      console.warn('⚠️  Run: npm run start:dev (wait for startup to complete, then stop)');
      console.warn('⚠️  Then re-run this script to populate role-permission relationships.');
      return;
    }

    // Define role-permission matrix (same as DatabaseSeederService)
    const rolePermissionMatrix = {
      [RoleName.TENANT_OWNER]: [
        // Full access to all tenant features
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
        // Administrative access excluding Tenant Owner functions
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
    const roles = await roleRepo.find();

    // Create lookup maps
    const roleMap = new Map(roles.map(role => [role.name, role]));
    const permissionMap = new Map(permissions.map(permission => [permission.name, permission]));

    let grantedCount = 0;
    let existingCount = 0;
    let missingPermissions = new Set<string>();

    // Assign permissions to roles for this specific tenant
    for (const [roleName, permissionNames] of Object.entries(rolePermissionMatrix)) {
      const role = roleMap.get(roleName as RoleName);
      if (!role) {
        console.warn(`⚠️  Role not found: ${roleName}`);
        continue;
      }

      for (const permissionName of permissionNames) {
        const permission = permissionMap.get(permissionName);
        if (!permission) {
          missingPermissions.add(permissionName);
          continue;
        }

        // Check if role-permission relationship already exists for this tenant
        const existingRolePermission = await rolePermissionRepo.findOne({
          where: { 
            roleId: role.id, 
            permissionId: permission.id,
            tenantId: tenantId
          },
        });

        if (!existingRolePermission) {
          const rolePermission = rolePermissionRepo.create({
            roleId: role.id,
            permissionId: permission.id,
            tenantId: tenantId,
            isGranted: true,
          });

          await rolePermissionRepo.save(rolePermission);
          grantedCount++;
        } else {
          // Update existing relationship to ensure it's granted
          if (!existingRolePermission.isGranted) {
            existingRolePermission.isGranted = true;
            await rolePermissionRepo.save(existingRolePermission);
            grantedCount++;
          } else {
            existingCount++;
          }
        }
      }
    }

    if (missingPermissions.size > 0) {
      console.warn(`⚠️  Missing permissions (${missingPermissions.size}):`, Array.from(missingPermissions).join(', '));
      console.warn(`⚠️  Run: npm run start:dev (wait for startup to complete, then stop)`);
      console.warn(`⚠️  Then re-run this script to populate missing permissions.`);
    }

    console.log(`✅ Role-permission relationships for tenant ${tenantId}:`);
    console.log(`   - ${grantedCount} new relationships granted`);
    console.log(`   - ${existingCount} existing relationships found`);
  }

  /**
   * Get role description in multiple languages
   */
  private getRoleDescription(roleName: RoleName): string {
    const descriptions = {
      [RoleName.TENANT_OWNER]: 'Owner of the tenant organization with full access',
      [RoleName.ADMIN]: 'Administrator with management privileges',
      [RoleName.MANAGER]: 'Manager with operational oversight',
      [RoleName.EMPLOYEE]: 'Employee with standard access',
      [RoleName.STAFF]: 'Staff member with limited access',
    };
    
    return descriptions[roleName] || 'Standard role';
  }

  /**
   * Main execution method
   */
  async execute(): Promise<void> {
    console.log('🚀 Starting sample data insertion...');
    console.log('=====================================');
    
    try {
      await this.connect();
      
      // Insert sample data
      const tenants = await this.insertSampleTenants();
      const roles = await this.insertDefaultRoles();
      await this.insertSampleUsers(tenants, roles);
      const categories = await this.insertSampleCategories(tenants);
      await this.insertSampleInventoryItems(tenants, categories);
      
      // Seed role-permission relationships for both tenants
      await this.seedTenantRolePermissions(tenants.persian.id);
      await this.seedTenantRolePermissions(tenants.arabic.id);
      
      console.log('=====================================');
      console.log('✅ Sample data insertion completed successfully!');
      console.log('');
      console.log('📊 Summary:');
      console.log('  - 2 Tenants (Persian & Arabic)');
      console.log('  - 5 Default Roles');
      console.log('  - 6 Users (3 per tenant)');
      console.log('  - 12 Categories (6 per tenant)');
      console.log('  - 8 Inventory Items (4 per tenant)');
      console.log('  - Role-Permission relationships seeded for both tenants');
      console.log('');
      console.log('🔐 Default user credentials:');
      console.log('  Password for all users: SamplePass123!');
      console.log('');
      console.log('📝 Persian Tenant:');
      console.log('  - Company: شرکت اجاره پارس');
      console.log('  - Owner: ali.ahmadi@parsi.com');
      console.log('  - Manager: zahra.mohammadi@parsi.com');
      console.log('  - Employee: hassan.rezaei@parsi.com');
      console.log('');
      console.log('📝 Arabic Tenant:');
      console.log('  - Company: شركة الإمارات للإيجار');
      console.log('  - Owner: ahmed.alsaadi@emirates.ae');
      console.log('  - Admin: fatima.alzahra@emirates.ae');
      console.log('  - Staff: mohamed.alnoor@emirates.ae');
      
    } catch (error) {
      console.error('❌ Error during sample data insertion:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

/**
 * Script entry point
 */
async function main(): Promise<void> {
  const inserter = new SampleDataInserter();
  
  try {
    await inserter.execute();
    process.exit(0);
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

export { SampleDataInserter };
