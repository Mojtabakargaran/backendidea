#!/usr/bin/env node

const { DataSource } = require('typeorm');
const bcrypt = require('bcrypt');

/**
 * Sample Data Insertion Script for Samanin Rental App (JavaScript Version)
 * This script inserts sample data in Persian and Arabic languages
 * 
 * Usage: npm run sample-data:js
 * Or: node scripts/insert-sample-data.js
 */
class SampleDataInserter {
  constructor() {
    // Database configuration - matches the backend config
    this.dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || (() => { throw new Error('DB_PASSWORD environment variable is required') })(),
      database: process.env.DB_DATABASE || 'samanin_dev',
      // Use empty entities array since we're using raw SQL
      entities: [],
      synchronize: false, // Don't modify schema
      logging: true,
    });
  }

  async connect() {
    try {
      await this.dataSource.initialize();
      console.log('✅ Database connection established');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
      console.log('✅ Database connection closed');
    }
  }

  /**
   * Insert sample tenants with Persian and Arabic companies
   */
  async insertSampleTenants() {
    console.log('📦 Inserting sample tenants...');
    
    try {
      // Check if Persian tenant already exists
      const persianExists = await this.dataSource.query(`
        SELECT id, company_name FROM tenants WHERE company_name = $1
      `, ['شرکت اجاره پارس']);

      let persianTenant = null;
      if (persianExists.length > 0) {
        persianTenant = persianExists[0];
        console.log(`ℹ️  Persian tenant already exists: ${persianTenant.company_name}`);
      } else {
        const persianTenantResult = await this.dataSource.query(`
          INSERT INTO tenants (company_name, language, locale, status, max_users)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, company_name
        `, [
          'شرکت اجاره پارس',
          'persian',
          'iran', 
          'active',
          10
        ]);
        persianTenant = persianTenantResult[0];
        console.log(`✅ Persian tenant created: ${persianTenant.company_name}`);
      }

      // Check if Arabic tenant already exists
      const arabicExists = await this.dataSource.query(`
        SELECT id, company_name FROM tenants WHERE company_name = $1
      `, ['شركة الإمارات للإيجار']);

      let arabicTenant = null;
      if (arabicExists.length > 0) {
        arabicTenant = arabicExists[0];
        console.log(`ℹ️  Arabic tenant already exists: ${arabicTenant.company_name}`);
      } else {
        const arabicTenantResult = await this.dataSource.query(`
          INSERT INTO tenants (company_name, language, locale, status, max_users)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, company_name
        `, [
          'شركة الإمارات للإيجار',
          'arabic',
          'uae',
          'active', 
          10
        ]);
        arabicTenant = arabicTenantResult[0];
        console.log(`✅ Arabic tenant created: ${arabicTenant.company_name}`);
      }
      
      return { persian: persianTenant, arabic: arabicTenant };
    } catch (error) {
      console.error('❌ Error inserting tenants:', error.message);
      return { persian: null, arabic: null };
    }
  }

  /**
   * Seed role-permission relationships for a specific tenant
   * Replicates the logic from DatabaseSeederService.seedTenantRolePermissions
   */
  async seedTenantRolePermissions(tenantId) {
    console.log(`🔑 Seeding role-permission relationships for tenant: ${tenantId}`);
    
    try {
      // Get all roles and permissions
      const roles = await this.dataSource.query('SELECT id, name FROM roles');
      const permissions = await this.dataSource.query('SELECT id, name FROM permissions');
      
      // Check if permissions exist
      if (permissions.length === 0) {
        console.warn(`⚠️  No permissions found in database. Please start the backend application first to seed system permissions.`);
        console.warn(`⚠️  Run: npm run start:dev (wait for startup to complete, then stop)`);
        console.warn(`⚠️  Then re-run this script to populate role-permission relationships.`);
        return;
      }

      // Define role-permission matrix (same as DatabaseSeederService)
      const rolePermissionMatrix = {
        'tenant_owner': [
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
        'admin': [
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
        'manager': [
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
        'employee': [
          // Standard operational access
          'users:read',
          'roles:read',
          'permissions:read',
          'tenants:read',
          'dashboard:read',
          'sessions:read',
          'profile:read', 'profile:update',
          'inventory:read', 'inventory:update',
        ],
        'staff': [
          // Basic operational access
          'users:read',
          'dashboard:read',
          'sessions:read',
          'profile:read', 'profile:update',
          'inventory:read',
        ],
      };

      // Create lookup maps
      const roleMap = new Map(roles.map(role => [role.name, role]));
      const permissionMap = new Map(permissions.map(permission => [permission.name, permission]));

      let grantedCount = 0;
      let existingCount = 0;
      let missingPermissions = new Set();

      // Assign permissions to roles for this specific tenant
      for (const [roleName, permissionNames] of Object.entries(rolePermissionMatrix)) {
        const role = roleMap.get(roleName);
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
          const existing = await this.dataSource.query(`
            SELECT id FROM role_permissions 
            WHERE role_id = $1 AND permission_id = $2 AND tenant_id = $3
          `, [role.id, permission.id, tenantId]);

          if (existing.length === 0) {
            // Create new role-permission relationship
            await this.dataSource.query(`
              INSERT INTO role_permissions (role_id, permission_id, tenant_id, is_granted)
              VALUES ($1, $2, $3, $4)
            `, [role.id, permission.id, tenantId, true]);
            grantedCount++;
          } else {
            // Update existing relationship to ensure it's granted
            await this.dataSource.query(`
              UPDATE role_permissions 
              SET is_granted = true 
              WHERE role_id = $1 AND permission_id = $2 AND tenant_id = $3 AND is_granted = false
            `, [role.id, permission.id, tenantId]);
            existingCount++;
          }
        }
      }

      if (missingPermissions.size > 0) {
        console.warn(`⚠️  Some permissions were not found: ${Array.from(missingPermissions).slice(0, 5).join(', ')}${missingPermissions.size > 5 ? '...' : ''}`);
        console.warn(`⚠️  This is normal if the backend application hasn't been started yet.`);
      }

      console.log(`✅ Tenant role-permissions seeded: ${grantedCount} granted, ${existingCount} existing`);
    } catch (error) {
      console.error(`❌ Error seeding role-permissions for tenant ${tenantId}:`, error.message);
      throw error;
    }
  }

  /**
   * Insert default roles
   */
  async insertDefaultRoles() {
    console.log('👥 Inserting default roles...');
    
    const roleNames = [
      'tenant_owner',
      'admin', 
      'manager',
      'employee',
      'staff'
    ];

    const roles = [];

    for (const roleName of roleNames) {
      try {
        // Check if role already exists
        const exists = await this.dataSource.query(`
          SELECT id, name FROM roles WHERE name = $1
        `, [roleName]);

        if (exists.length > 0) {
          roles.push(exists[0]);
          console.log(`ℹ️  Role already exists: ${exists[0].name}`);
        } else {
          const result = await this.dataSource.query(`
            INSERT INTO roles (name, description, is_system_role, is_active)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name
          `, [
            roleName,
            this.getRoleDescription(roleName),
            true,
            true
          ]);

          roles.push(result[0]);
          console.log(`✅ Role created: ${result[0].name}`);
        }
      } catch (error) {
        console.error(`❌ Error creating role ${roleName}:`, error.message);
      }
    }
    
    return roles;
  }

  /**
   * Insert sample users for both tenants
   */
  async insertSampleUsers(tenants, roles) {
    if (!tenants.persian && !tenants.arabic) {
      console.log('⚠️  No tenants found, skipping user creation');
      return;
    }

    console.log('👤 Inserting sample users...');
    
    const passwordHash = await bcrypt.hash('SamplePass123!', 12);
    
    const users = [];

    // Persian users
    if (tenants.persian) {
      const persianUsers = [
        {
          fullName: 'علی احمدی',
          email: 'aliahmadi@parsi.com',
          phoneNumber: '+98912345678',
          tenantId: tenants.persian.id,
          roleName: 'tenant_owner',
        },
        {
          fullName: 'زهرا محمدی',
          email: 'zahramohammadi@parsi.com',
          phoneNumber: '+98912345679',
          tenantId: tenants.persian.id,
          roleName: 'manager',
        },
        {
          fullName: 'حسن رضایی',
          email: 'hassanrezaei@parsi.com',
          phoneNumber: '+98912345680',
          tenantId: tenants.persian.id,
          roleName: 'employee',
        },
      ];
      users.push(...persianUsers);
    }

    // Arabic users
    if (tenants.arabic) {
      const arabicUsers = [
        {
          fullName: 'أحمد السعدي',
          email: 'ahmedalsaadi@emirate.ae',
          phoneNumber: '+971501234567',
          tenantId: tenants.arabic.id,
          roleName: 'tenant_owner',
        },
        {
          fullName: 'فاطمة الزهراء',
          email: 'fatimaalzahra@emirate.ae',
          phoneNumber: '+971501234568',
          tenantId: tenants.arabic.id,
          roleName: 'admin',
        },
        {
          fullName: 'محمد النور',
          email: 'mohamedalnoor@emirate.ae',
          phoneNumber: '+971501234569',
          tenantId: tenants.arabic.id,
          roleName: 'staff',
        },
      ];
      users.push(...arabicUsers);
    }
    
    for (const userData of users) {
      try {
        // Check if user already exists
        const userExists = await this.dataSource.query(`
          SELECT id, full_name, email FROM users WHERE email = $1
        `, [userData.email]);

        if (userExists.length > 0) {
          console.log(`ℹ️  User already exists: ${userExists[0].full_name} (${userExists[0].email})`);
          continue;
        }

        // Create user
        const userResult = await this.dataSource.query(`
          INSERT INTO users (tenant_id, full_name, email, phone_number, password_hash, status, email_verified_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, full_name, email
        `, [
          userData.tenantId,
          userData.fullName,
          userData.email,
          userData.phoneNumber,
          passwordHash,
          'active',
          new Date()
        ]);

        const user = userResult[0];
        
        // Assign role
        const role = roles.find(r => r.name === userData.roleName);
        if (role) {
          await this.dataSource.query(`
            INSERT INTO user_roles (user_id, role_id, tenant_id, assigned_reason, is_active)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            user.id,
            role.id,
            userData.tenantId,
            'System initialization',
            true
          ]);
        }
        
        console.log(`✅ User created: ${user.full_name} (${user.email})`);
      } catch (error) {
        console.error(`❌ Failed to create user ${userData.email}:`, error.message);
      }
    }
  }

  /**
   * Insert sample categories for both tenants
   */
  async insertSampleCategories(tenants) {
    if (!tenants.persian && !tenants.arabic) {
      console.log('⚠️  No tenants found, skipping category creation');
      return { persian: [], arabic: [] };
    }

    console.log('📂 Inserting sample categories...');
    
    const persianCategories = [];
    const arabicCategories = [];

    // Persian categories
    if (tenants.persian) {
      const persianCategoryData = [
        { name: 'وسایل الکترونیکی', description: 'تجهیزات الکترونیکی و دیجیتال' },
        { name: 'مبلمان اداری', description: 'میز، صندلی و تجهیزات اداری' },
        { name: 'ابزار ساختمانی', description: 'ابزار و تجهیزات ساخت و ساز' },
        { name: 'وسایل نقلیه', description: 'خودرو، موتور و وسایل حمل و نقل' },
        { name: 'تجهیزات پزشکی', description: 'دستگاه‌های پزشکی و بهداشتی' },
        { name: 'لوازم خانگی', description: 'یخچال، ماشین لباسشویی و سایر لوازم' },
      ];

      for (const catData of persianCategoryData) {
        try {
          // Check if category already exists
          const exists = await this.dataSource.query(`
            SELECT id, name FROM categories WHERE tenant_id = $1 AND name = $2
          `, [tenants.persian.id, catData.name]);

          if (exists.length > 0) {
            persianCategories.push(exists[0]);
            console.log(`ℹ️  Persian category already exists: ${exists[0].name}`);
          } else {
            const result = await this.dataSource.query(`
              INSERT INTO categories (tenant_id, name, description)
              VALUES ($1, $2, $3)
              RETURNING id, name
            `, [
              tenants.persian.id,
              catData.name,
              catData.description
            ]);

            persianCategories.push(result[0]);
            console.log(`✅ Persian category created: ${result[0].name}`);
          }
        } catch (error) {
          console.error(`❌ Failed to create Persian category ${catData.name}:`, error.message);
        }
      }
    }

    // Arabic categories  
    if (tenants.arabic) {
      const arabicCategoryData = [
        { name: 'الأجهزة الإلكترونية', description: 'المعدات الإلكترونية والرقمية' },
        { name: 'أثاث المكاتب', description: 'المكاتب والكراسي والمعدات المكتبية' },
        { name: 'أدوات البناء', description: 'أدوات ومعدات البناء والتشييد' },
        { name: 'وسائل النقل', description: 'السيارات والدراجات النارية ووسائل النقل' },
        { name: 'المعدات الطبية', description: 'الأجهزة الطبية والصحية' },
        { name: 'الأجهزة المنزلية', description: 'الثلاجات وغسالات الملابس وأجهزة أخرى' },
      ];

      for (const catData of arabicCategoryData) {
        try {
          // Check if category already exists
          const exists = await this.dataSource.query(`
            SELECT id, name FROM categories WHERE tenant_id = $1 AND name = $2
          `, [tenants.arabic.id, catData.name]);

          if (exists.length > 0) {
            arabicCategories.push(exists[0]);
            console.log(`ℹ️  Arabic category already exists: ${exists[0].name}`);
          } else {
            const result = await this.dataSource.query(`
              INSERT INTO categories (tenant_id, name, description)
              VALUES ($1, $2, $3)
              RETURNING id, name
            `, [
              tenants.arabic.id,
              catData.name,
              catData.description
            ]);

            arabicCategories.push(result[0]);
            console.log(`✅ Arabic category created: ${result[0].name}`);
          }
        } catch (error) {
          console.error(`❌ Failed to create Arabic category ${catData.name}:`, error.message);
        }
      }
    }
    
    return { persian: persianCategories, arabic: arabicCategories };
  }

  /**
   * Insert sample inventory items for both tenants
   */
  async insertSampleInventoryItems(tenants, categories) {
    if ((!tenants.persian && !tenants.arabic) || (categories.persian.length === 0 && categories.arabic.length === 0)) {
      console.log('⚠️  No tenants or categories found, skipping inventory creation');
      return;
    }

    console.log('📦 Inserting sample inventory items...');
    
    // Persian inventory items
    if (tenants.persian && categories.persian.length > 0) {
      const persianItems = [
        {
          name: 'لپ تاپ ایسوس',
          description: 'لپ تاپ ایسوس مدل ROG با پردازنده i7',
          categoryName: 'الکترونیکی',
          itemType: 'serialized',
          serialNumber: 'ASUS-001-2024',
          availabilityStatus: 'available',
          tenantId: tenants.persian.id,
        },
        {
          name: 'میز اداری چوبی',
          description: 'میز اداری چوبی با کشو و قفل',
          categoryName: 'مبلمان',
          itemType: 'non_serialized',
          quantity: 15,
          availabilityStatus: 'available',
          tenantId: tenants.persian.id,
        },
        {
          name: 'دریل برقی بوش',
          description: 'دریل برقی بوش مدل PSB 1800 LI-2',
          categoryName: 'ساختمانی',
          itemType: 'serialized',
          serialNumber: 'BOSCH-DRL-001',
          availabilityStatus: 'rented',
          tenantId: tenants.persian.id,
        },
        {
          name: 'یخچال ال جی',
          description: 'یخچال ال جی دوقلو 25 فوت',
          categoryName: 'خانگی',
          itemType: 'serialized',
          serialNumber: 'LG-REF-001',
          availabilityStatus: 'maintenance',
          tenantId: tenants.persian.id,
        },
      ];

      await this.insertInventoryItems(persianItems, categories.persian);
    }

    // Arabic inventory items
    if (tenants.arabic && categories.arabic.length > 0) {
      const arabicItems = [
        {
          name: 'حاسوب محمول HP',
          description: 'حاسوب محمول HP بمعالج Intel i5 وذاكرة 16GB',
          categoryName: 'الإلكترونية',
          itemType: 'serialized',
          serialNumber: 'HP-LAP-001-2024',
          availabilityStatus: 'available',
          tenantId: tenants.arabic.id,
        },
        {
          name: 'كرسي مكتب جلدي',
          description: 'كرسي مكتب جلدي قابل للتعديل',
          categoryName: 'أثاث',
          itemType: 'non_serialized',
          quantity: 20,
          availabilityStatus: 'available',
          tenantId: tenants.arabic.id,
        },
        {
          name: 'مثقاب كهربائي ديوالت',
          description: 'مثقاب كهربائي ديوالت مع مجموعة لقم',
          categoryName: 'البناء',
          itemType: 'serialized',
          serialNumber: 'DEWALT-DRL-001',
          availabilityStatus: 'available',
          tenantId: tenants.arabic.id,
        },
        {
          name: 'ثلاجة سامسونج',
          description: 'ثلاجة سامسونج بابين بسعة 500 لتر',
          categoryName: 'المنزلية',
          itemType: 'serialized',
          serialNumber: 'SAMSUNG-REF-001',
          availabilityStatus: 'damaged',
          tenantId: tenants.arabic.id,
        },
      ];

      await this.insertInventoryItems(arabicItems, categories.arabic);
    }
  }

  /**
   * Helper method to insert inventory items
   */
  async insertInventoryItems(items, categories) {
    for (const itemData of items) {
      try {
        // Find matching category
        const category = categories.find(c => c.name.includes(itemData.categoryName));
        if (!category) {
          console.warn(`⚠️  Category not found for item: ${itemData.name} (looking for: ${itemData.categoryName})`);
          continue;
        }

        // Check if inventory item already exists
        const exists = await this.dataSource.query(`
          SELECT id, name FROM inventory_items WHERE tenant_id = $1 AND name = $2
        `, [itemData.tenantId, itemData.name]);

        if (exists.length > 0) {
          console.log(`ℹ️  Inventory item already exists: ${exists[0].name}`);
          continue;
        }

        const conditionNotes = this.getConditionNotes(itemData.availabilityStatus);

        const result = await this.dataSource.query(`
          INSERT INTO inventory_items (
            name, description, tenant_id, category_id, item_type, 
            serial_number, quantity, allocated_quantity, availability_status, 
            status, version, has_rental_history, condition_notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING id, name
        `, [
          itemData.name,
          itemData.description,
          itemData.tenantId,
          category.id,
          itemData.itemType,
          itemData.serialNumber || null,
          itemData.quantity || null,
          0, // allocated_quantity
          itemData.availabilityStatus,
          'active', // status
          1, // version
          itemData.availabilityStatus === 'rented', // has_rental_history
          conditionNotes
        ]);

        console.log(`✅ Inventory item created: ${result[0].name}`);
      } catch (error) {
        console.error(`❌ Failed to create inventory item ${itemData.name}:`, error.message);
      }
    }
  }

  /**
   * Get condition notes based on availability status
   */
  getConditionNotes(availabilityStatus) {
    switch (availabilityStatus) {
      case 'maintenance':
        return 'در حال تعمیر و نگهداری';
      case 'damaged':
        return 'نیاز به تعمیر';
      default:
        return 'وضعیت عادی';
    }
  }

  /**
   * Get role description
   */
  getRoleDescription(roleName) {
    const descriptions = {
      'tenant_owner': 'Owner of the tenant organization with full access',
      'admin': 'Administrator with management privileges',
      'manager': 'Manager with operational oversight',
      'employee': 'Employee with standard access',
      'staff': 'Staff member with limited access',
    };
    
    return descriptions[roleName] || 'Standard role';
  }

  /**
   * Main execution method
   */
  async execute() {
    console.log('🚀 Starting sample data insertion...');
    console.log('=====================================');
    
    try {
      await this.connect();
      
      // Insert sample data
      const tenants = await this.insertSampleTenants();
      const roles = await this.insertDefaultRoles();
      
      // Seed role-permission relationships for created tenants AFTER roles are created
      if (tenants.persian && tenants.persian.id) {
        await this.seedTenantRolePermissions(tenants.persian.id);
      }
      if (tenants.arabic && tenants.arabic.id) {
        await this.seedTenantRolePermissions(tenants.arabic.id);
      }
      
      await this.insertSampleUsers(tenants, roles);
      const categories = await this.insertSampleCategories(tenants);
      await this.insertSampleInventoryItems(tenants, categories);
      
      console.log('=====================================');
      console.log('✅ Sample data insertion completed successfully!');
      console.log('');
      console.log('📊 Summary:');
      console.log('  - 2 Tenants (Persian & Arabic)');
      console.log('  - 5 Default Roles with tenant-specific permissions');
      console.log('  - 6 Users (3 per tenant)');
      console.log('  - 12 Categories (6 per tenant)');
      console.log('  - 8 Inventory Items (4 per tenant)');
      console.log('  - Role-Permission relationships automatically seeded per tenant');
      console.log('');
      console.log('🔐 Default user credentials:');
      console.log('  Password for all users: SamplePass123!');
      console.log('');
      console.log('📝 Persian Tenant:');
      console.log('  - Company: شرکت اجاره پارس');
      console.log('  - Owner: ali.ahmadi@parsirent.com');
      console.log('  - Manager: zahra.mohammadi@parsirent.com');
      console.log('  - Employee: hassan.rezaei@parsirent.com');
      console.log('');
      console.log('📝 Arabic Tenant:');
      console.log('  - Company: شركة الإمارات للإيجار');
      console.log('  - Owner: ahmed.alsaadi@emiratesrent.ae');
      console.log('  - Admin: fatima.alzahra@emiratesrent.ae');
      console.log('  - Staff: mohamed.alnoor@emiratesrent.ae');
      
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
async function main() {
  const inserter = new SampleDataInserter();
  
  try {
    await inserter.execute();
    process.exit(0);
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = { SampleDataInserter };
