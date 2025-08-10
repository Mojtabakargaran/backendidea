import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from '@/entities/user.entity';
import { Tenant } from '@/entities/tenant.entity';
import { Role } from '@/entities/role.entity';
import { UserRole } from '@/entities/user-role.entity';
import { EmailVerification } from '@/entities/email-verification.entity';
import { Language, Locale, RoleName } from '@/common/enums';
import { MessageKeys } from '@/common/message-keys';

describe('Auth Registration (e2e) - ?', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const validRegistrationData = {
    fullName: 'Ahmad Mohammad',
    email: 'ahmad@example.com',
    password: 'SecurePass123!',
    confirmPassword: 'SecurePass123!',
    companyName: 'Test Rental Company',
    language: Language.PERSIAN,
    locale: Locale.IRAN,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'test',
          database: process.env.DB_DATABASE || 'samanin_test',
          entities: [User, Tenant, Role, UserRole, EmailVerification],
          synchronize: true,
          dropSchema: true,
        }),
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );

    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    await seedTestData();
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await dataSource.query(
      'TRUNCATE TABLE user_roles, email_verifications, users, tenants CASCADE',
    );
  });

  async function seedTestData() {
    // Seed default roles required for registration
    const roleRepository = dataSource.getRepository(Role);

    const tenantOwnerRole = roleRepository.create({
      name: RoleName.TENANT_OWNER,
      description: 'Tenant Owner Role',
      isSystemRole: true,
      isActive: true,
    });

    await roleRepository.save(tenantOwnerRole);
  }

  describe('POST /api/auth/register', () => {
    it('should successfully register user and create tenant (? Main Success Scenario)', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201);

      // Assert Response
      expect(response.body).toMatchObject({
        code: MessageKeys.REGISTRATION_SUCCESS,
        message: expect.any(String),
        data: {
          userId: expect.any(String),
          tenantId: expect.any(String),
          email: validRegistrationData.email,
          redirectUrl: '/login',
        },
      });

      // Verify Tenant Creation (Step 9)
      const tenantRepository = dataSource.getRepository(Tenant);
      const tenant = await tenantRepository.findOne({
        where: { id: response.body.data.tenantId },
      });

      expect(tenant).toBeDefined();
      expect(tenant.companyName).toBe(validRegistrationData.companyName);
      expect(tenant.language).toBe(validRegistrationData.language);
      expect(tenant.locale).toBe(validRegistrationData.locale);

      // Verify User Creation (Step 10)
      const userRepository = dataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: response.body.data.userId },
      });

      expect(user).toBeDefined();
      expect(user.fullName).toBe(validRegistrationData.fullName);
      expect(user.email).toBe(validRegistrationData.email);
      expect(user.tenantId).toBe(tenant.id);

      // Verify Tenant Owner Role Assignment (Step 11, BR03)
      const userRoleRepository = dataSource.getRepository(UserRole);
      const userRole = await userRoleRepository.findOne({
        where: { userId: user.id, tenantId: tenant.id },
        relations: ['role'],
      });

      expect(userRole).toBeDefined();
      expect(userRole.role.name).toBe(RoleName.TENANT_OWNER);

      // Verify Email Verification Record (Step 12)
      const emailVerificationRepository =
        dataSource.getRepository(EmailVerification);
      const emailVerification = await emailVerificationRepository.findOne({
        where: { userId: user.id },
      });

      expect(emailVerification).toBeDefined();
      expect(emailVerification.token).toBeDefined();
    });

    it('should register user with Arabic language and UAE locale', async () => {
      // Arrange
      const arabicRegistrationData = {
        ...validRegistrationData,
        email: 'ahmad@example.ae',
        language: Language.ARABIC,
        locale: Locale.UAE,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(arabicRegistrationData)
        .expect(201);

      // Assert
      expect(response.body.code).toBe(MessageKeys.REGISTRATION_SUCCESS);

      // Verify tenant language/locale settings (BR04, BR05)
      const tenantRepository = dataSource.getRepository(Tenant);
      const tenant = await tenantRepository.findOne({
        where: { id: response.body.data.tenantId },
      });

      expect(tenant.language).toBe(Language.ARABIC);
      expect(tenant.locale).toBe(Locale.UAE);
    });

    it('should return 422 when email already exists (Alternative Flow 3a, BR01)', async () => {
      // Arrange - Create a user first
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201);

      // Act - Try to register with same email
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(422);

      // Assert
      expect(response.body).toMatchObject({
        code: MessageKeys.EMAIL_ALREADY_EXISTS,
        message: expect.any(String),
        errors: [
          {
            field: 'email',
            code: MessageKeys.EMAIL_ALREADY_EXISTS,
            message: expect.any(String),
          },
        ],
      });
    });

    it('should return 400 for validation errors (Alternative Flow 3d)', async () => {
      // Arrange
      const invalidData = {
        fullName: '', // Too short
        email: 'invalid-email', // Invalid format
        password: 'weak', // Doesn't meet policy
        confirmPassword: 'different', // Doesn't match
        companyName: '', // Too short
        language: 'invalid', // Invalid enum
        locale: 'invalid', // Invalid enum
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      // Assert
      expect(response.body.message).toContain('validation');
    });

    it('should return 400 when passwords do not match (Alternative Flow 3c)', async () => {
      // Arrange
      const passwordMismatchData = {
        ...validRegistrationData,
        password: 'SecurePass123!',
        confirmPassword: 'DifferentPass456@',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(passwordMismatchData)
        .expect(400);

      // Assert
      expect(response.body.message).toContain('validation');
    });

    it('should return 400 when password does not meet security policy (Alternative Flow 3b, BR06)', async () => {
      // Arrange
      const weakPasswordData = {
        ...validRegistrationData,
        password: 'password', // No uppercase, number, special char
        confirmPassword: 'password',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(weakPasswordData)
        .expect(400);

      // Assert
      expect(response.body.message).toContain('validation');
    });

    it('should handle case-insensitive email uniqueness', async () => {
      // Arrange - Register with lowercase email
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201);

      // Act - Try to register with uppercase email
      const upperCaseEmailData = {
        ...validRegistrationData,
        email: 'AHMAD@EXAMPLE.COM',
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(upperCaseEmailData)
        .expect(422);

      // Assert
      expect(response.body.code).toBe(MessageKeys.EMAIL_ALREADY_EXISTS);
    });

    it('should trim whitespace from string fields', async () => {
      // Arrange
      const dataWithWhitespace = {
        ...validRegistrationData,
        fullName: '  Ahmad Mohammad  ',
        email: '  ahmad@example.com  ',
        companyName: '  Test Company  ',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(dataWithWhitespace)
        .expect(201);

      // Assert
      const userRepository = dataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: response.body.data.userId },
      });

      expect(user.fullName).toBe('Ahmad Mohammad');
      expect(user.email).toBe('ahmad@example.com');

      const tenantRepository = dataSource.getRepository(Tenant);
      const tenant = await tenantRepository.findOne({
        where: { id: response.body.data.tenantId },
      });

      expect(tenant.companyName).toBe('Test Company');
    });
  });

  describe('Business Rules Verification', () => {
    it('should enforce BR02: Each registration creates exactly one new tenant', async () => {
      // Act
      const _response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201);

      // Assert
      const tenantRepository = dataSource.getRepository(Tenant);
      const tenantCount = await tenantRepository.count();

      expect(tenantCount).toBe(1);
    });

    it('should enforce BR07: Registration does not automatically log in the user', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201);

      // Assert - No authentication token should be returned
      expect(response.body.data).not.toHaveProperty('accessToken');
      expect(response.body.data).not.toHaveProperty('refreshToken');
      expect(response.body.data.redirectUrl).toBe('/login');
    });
  });
});
