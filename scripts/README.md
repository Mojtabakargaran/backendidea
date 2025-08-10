# Sample Data Insertion Scripts

This directory contains scripts to insert sample data in Persian and Arabic languages for the Samanin Rental Management Platform.

## Files

- `insert-sample-data.ts` - TypeScript version of the sample data insertion script
- `README.md` - This documentation file

## Features

The script inserts the following sample data:

### 🏢 Tenants
- **Persian Tenant**: شرکت اجاره پارس (Persian rental company)
- **Arabic Tenant**: شركة الإمارات للإيجار (Emirates rental company)

### 👥 Users (6 total)
**Persian Users:**
- علی احمدی (Ali Ahmadi) - Tenant Owner  ali.ahmadi@parsirent.com
- زهرا محمدی (Zahra Mohammadi) - Manager  zahra.mohammadi@parsirent.com
- حسن رضایی (Hassan Rezaei) - Employee  hassan.rezaei@parsirent.com

**Arabic Users:**
- أحمد السعدي (Ahmed Al-Saadi) - Tenant Owner  ahmed.alsaadi@emiratesrent.ae
- فاطمة الزهراء (Fatima Al-Zahra) - Admin  fatima.alzahra@emiratesrent.ae
- محمد النور (Mohamed Al-Noor) - Staff  mohamed.alnoor@emiratesrent.ae

### 🔐 Default Credentials
**Password for all users:** `SamplePass123!`

### 🔐 Role-Based Access Control (RBAC)
**5 System Roles with Tenant-Specific Permissions:**
- **Tenant Owner**: Full administrative access within tenant (all permissions)
- **Admin**: Administrative access excluding tenant owner functions
- **Manager**: Supervisory access to operations and limited user management
- **Employee**: Standard operational access to core features
- **Staff**: Basic access with task-specific permissions

**Automatic Permission Seeding:** When tenants are created, role-permission relationships are automatically populated following the same business rules as the main application registration process. Each tenant gets isolated permission sets.

### 📂 Categories (12 total - 6 per tenant)
**Persian Categories:**
- وسایل الکترونیکی (Electronics)
- مبلمان اداری (Office Furniture)
- ابزار ساختمانی (Construction Tools)
- وسایل نقلیه (Vehicles)
- تجهیزات پزشکی (Medical Equipment)
- لوازم خانگی (Home Appliances)

**Arabic Categories:**
- الأجهزة الإلكترونية (Electronics)
- أثاث المكاتب (Office Furniture)
- أدوات البناء (Construction Tools)
- وسائل النقل (Transportation)
- المعدات الطبية (Medical Equipment)
- الأجهزة المنزلية (Home Appliances)

### 📦 Inventory Items (8 total - 4 per tenant)
**Persian Items:**
- لپ تاپ ایسوس (ASUS Laptop) - Available
- میز اداری چوبی (Wooden Office Desk) - Available
- دریل برقی بوش (Bosch Electric Drill) - Rented
- یخچال ال جی (LG Refrigerator) - Maintenance

**Arabic Items:**
- حاسوب محمول HP (HP Laptop) - Available
- كرسي مكتب جلدي (Leather Office Chair) - Available
- مثقاب كهربائي ديوالت (DeWalt Electric Drill) - Available
- ثلاجة سامسونج (Samsung Refrigerator) - Damaged


## 🚀 Prerequisites

**Important:** Before running the sample data script, you must start the backend application at least once to ensure that system permissions are seeded.

1. **Start the backend development server:**
   ```bash
   npm run start:dev
   ```
   Wait for the application to fully start and seed the permissions, then you can stop it.

2. **Run the sample data script:**
   ```bash
   npm run sample-data
   ```

### Why This Order Matters
- **Permissions Seeding**: The `DatabaseSeederService` runs during application startup and creates all system permissions
- **Role-Permission Relationships**: Our script creates tenant-specific role-permission relationships using those permissions
- **Tenant Isolation**: Each tenant gets its own isolated set of role-permission relationships automatically

## 🚀 Usage

### Prerequisites

1. Make sure your database is running and accessible
2. Ensure your `.env` file is properly configured with database credentials (see `.env.example` in this folder)
3. The database schema should already exist (run migrations first if needed)

### Quick Test

Before running the actual script, you can test if it compiles correctly:

```bash
cd backend
npm run sample-data:test
```

### Method 1: Using npm script (Recommended)

First run backend as mentioned in prerequisites

```bash
cd backend
npm run sample-data:js
```

### Method 2: Direct execution with Node.js

```bash
cd backend
node scripts/insert-sample-data.js
```

### Method 3: Using TypeScript version (Advanced)

If you prefer the TypeScript version and have resolved any compilation issues:

```bash
cd backend
npm run sample-data
```

## Environment Variables

The script uses the following environment variables for database connection:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=samanin_dev
NODE_ENV=development
```

You can copy the `.env.example` file in this directory to your backend root as `.env`:

```bash
# From the backend directory
cp scripts/.env.example .env
# Then edit .env with your actual database credentials
```

If these variables are not set, the script will use the default values shown above.

## Important Notes

⚠️ **This script is designed for development and testing purposes only**

- The script does NOT run automatically when the project starts
- It will NOT interfere with your existing database seeder
- You need to run it manually when you want sample data
- The script uses transactions to ensure data consistency
- If the script fails, it will rollback all changes

## Output

When the script runs successfully, you'll see detailed output showing:
- Database connection status
- Progress of data insertion
- Summary of created records
- User credentials and login information

## Customization

You can easily customize the sample data by editing the `insert-sample-data.ts` file:

- Modify user names and details
- Add more categories or inventory items
- Change company names or descriptions
- Adjust pricing and availability status

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check your database credentials in `.env`
   - Ensure PostgreSQL is running
   - Verify database name exists

2. **Import Errors**
   - Make sure all dependencies are installed: `npm install`
   - Check TypeScript configuration

3. **Permission Errors**
   - Ensure your database user has INSERT permissions
   - Check if tables exist (run migrations first)

### Getting Help

If you encounter issues:

1. **"Permission not found" warnings**: Start the backend app first (`npm run start:dev`), wait for startup completion, then stop and re-run the script
2. Check the console output for detailed error messages
3. Verify your database schema is up to date
4. Ensure all required TypeScript packages are installed
5. Check that your `.env` file is properly configured

## 🔧 Troubleshooting

### Common Issues

**"No permissions found in database"**
- **Cause**: System permissions haven't been seeded yet
- **Solution**: Run `npm run start:dev` once to seed permissions, then stop and re-run the script

**"Role-Permission relationships automatically seeded per tenant"**
- This is the expected behavior following the same logic as the main application
- Each tenant gets isolated permission sets matching the DatabaseSeederService logic

**Script completes but warnings appear**
- Warnings about missing permissions are normal if the backend hasn't been started yet
- The sample data (tenants, users, categories, inventory) will still be created correctly
- Re-run after starting the backend once to populate role-permissions

## License

This script is part of the Samanin Rental Management Platform and follows the same license terms.
