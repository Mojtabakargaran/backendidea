import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
  BadRequestException,
  Logger,
  NotFoundException,
  HttpException,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  EntityManager,
  LessThan,
  MoreThan,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '@/entities/user.entity';
import { Tenant } from '@/entities/tenant.entity';
import { Role } from '@/entities/role.entity';
import { UserRole } from '@/entities/user-role.entity';
import { EmailVerification } from '@/entities/email-verification.entity';
import { UserSession } from '@/entities/user-session.entity';
import { LoginAttempt } from '@/entities/login-attempt.entity';
import { PasswordResetToken } from '@/entities/password-reset-token.entity';
import { RegisterUserRequestDto } from '../dto/register-user-request.dto';
import { RegisterUserResponseDto } from '../dto/register-user-response.dto';
import { LoginRequestDto } from '../dto/login-request.dto';
import { LoginResponseDto } from '../dto/login-response.dto';
import { LogoutResponseDto } from '../dto/logout-response.dto';
import { PasswordResetRequestDto } from '../dto/password-reset-request.dto';
import { PasswordResetRequestResponseDto } from '../dto/password-reset-request-response.dto';
import { PasswordResetCompleteRequestDto } from '../dto/password-reset-complete-request.dto';
import { PasswordResetCompleteResponseDto } from '../dto/password-reset-complete-response.dto';
import { EmailService } from './email.service';
import { I18nService } from '@/i18n/i18n.service';
import { DatabaseSeederService } from '@/database/database-seeder.service';
import { PermissionsService } from '@/permissions/permissions.service';
import { MessageKeys } from '@/common/message-keys';
import {
  RoleName,
  UserStatus,
  TenantStatus,
  EmailVerificationStatus,
} from '@/common/enums';

/**
 * Authentication Service
 * Handles user authentication, session management, and password reset
 * Implements ? - User Registration with Tenant Creation
 * Implements ? - User Login Authentication
 * Implements ? - User Logout
 * Implements ? - Password Reset Request
 * Implements ? - Password Reset Completion
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 12; // bcrypt rounds as specified in requirements

  // Business rule constants
  private readonly MAX_LOGIN_ATTEMPTS = 10; // BR12
  private readonly LOCKOUT_DURATION_HOURS = 1; // BR12
  private readonly SESSION_DURATION_HOURS = 8; // BR13
  private readonly RESET_TOKEN_DURATION_HOURS = 2; // BR16
  private readonly MAX_ATTEMPTS_PER_IP = 5; // BR11
  private readonly RATE_LIMIT_WINDOW_MINUTES = 15; // BR11

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
    @InjectRepository(EmailVerification)
    private emailVerificationRepository: Repository<EmailVerification>,
    @InjectRepository(UserSession)
    private userSessionRepository: Repository<UserSession>,
    @InjectRepository(LoginAttempt)
    private loginAttemptRepository: Repository<LoginAttempt>,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepository: Repository<PasswordResetToken>,
    private emailService: EmailService,
    private i18nService: I18nService,
    private dataSource: DataSource,
    private databaseSeederService: DatabaseSeederService,
    private permissionsService: PermissionsService,
  ) {}

  /**
   * Register new user with automatic tenant creation
   * Implements ? main success scenario
   */
  async registerUser(
    registerDto: RegisterUserRequestDto,
    acceptLanguage?: string,
  ): Promise<RegisterUserResponseDto> {
    // Step 6: System validates all input fields (handled by DTO validation)

    // Step 7: System checks email uniqueness across the entire platform (BR01)
    await this.validateEmailUniqueness(registerDto.email, acceptLanguage);

    // Step 8: System validates password against security policy (handled by DTO validation)

    // Use database transaction to ensure atomicity (Steps 9-11)
    const result = await this.dataSource.transaction(async (manager) => {
      try {
        // Step 9: System creates new tenant organization with unique tenant_id
        const tenant = await this.createTenant(registerDto, manager);

        // Step 10: System creates user account and assigns Tenant Owner role
        const user = await this.createUser(registerDto, tenant, manager);

        // Step 11: System saves tenant settings (already saved in createTenant)
        await this.assignTenantOwnerRole(user, tenant, manager);

        // Step 12: System creates email verification record and sends confirmation email
        const verificationToken = await this.createEmailVerificationRecord(
          user,
          manager,
        );

        // Return data for post-transaction operations
        return {
          user,
          tenant,
          verificationToken,
        };
      } catch (error) {
        this.logger.error('Registration failed', error);

        // Exception Flow 4a: System Error During Tenant Creation
        if (error.message === MessageKeys.EMAIL_ALREADY_EXISTS) {
          throw error; // Re-throw validation errors
        }

        // Check specific error types for proper error codes
        if (error.message?.includes('tenant') || error.code === '23505') {
          const translatedResponse = this.i18nService.translate(
            'system.TENANT_CREATION_FAILED',
            acceptLanguage,
          );
          throw new InternalServerErrorException({
            code: translatedResponse.code,
            message: translatedResponse.message,
          });
        }

        if (
          error.message?.includes('database') ||
          error.code?.startsWith('23')
        ) {
          const translatedResponse = this.i18nService.translate(
            'system.DATABASE_ERROR',
            acceptLanguage,
          );
          throw new InternalServerErrorException({
            code: translatedResponse.code,
            message: translatedResponse.message,
          });
        }

        // Generic fallback
        const translatedResponse = this.i18nService.translate(
          MessageKeys.REGISTRATION_TEMPORARILY_UNAVAILABLE,
          acceptLanguage,
        );
        throw new InternalServerErrorException({
          code: translatedResponse.code,
          message: translatedResponse.message,
        });
      }
    });

    // After transaction is committed, seed default permissions for the new tenant
    try {
      await this.databaseSeederService.seedTenantRolePermissions(
        result.tenant.id,
      );
      this.logger.log(
        `Default permissions seeded for tenant: ${result.tenant.id}`,
      );
    } catch (permissionError) {
      this.logger.error(
        'Failed to seed tenant permissions, but registration was successful',
        permissionError,
      );
      // Don't throw error - registration was successful
    }

    // After permission seeding, seed categories and inventory items for the new tenant
    try {
      this.logger.log(
        `Starting categories and inventory seeding for tenant: ${result.tenant.id}, language: ${result.tenant.language}`,
      );

      // Seed categories first
      const categories = await this.databaseSeederService.seedTenantCategories(
        result.tenant.id,
        result.tenant.language,
      );
      this.logger.log(
        `Categories seeded for tenant: ${result.tenant.id}, count: ${categories.length}`,
      );

      // Then seed inventory items
      await this.databaseSeederService.seedTenantInventoryItems(
        result.tenant.id,
        result.tenant.language,
        categories,
      );
      this.logger.log(`Inventory items seeded for tenant: ${result.tenant.id}`);
    } catch (seedingError) {
      this.logger.error(
        'Failed to seed tenant categories/inventory, but registration was successful',
        seedingError,
      );
      // Don't throw error - registration was successful
    }

    // After permission seeding, send the verification email (Step 12 continued)
    let emailSent = false;
    try {
      // Ensure user has tenant relationship for email language support
      result.user.tenant = result.tenant;
      await this.sendVerificationEmail(result.user, result.verificationToken);
      emailSent = true;
    } catch (emailError) {
      this.logger.warn(
        'Email delivery failed, but registration was successful',
        emailError,
      );
      // Don't throw error - registration was successful
    }

    // Step 13: System redirects user to login page with success message
    const messageKey = emailSent
      ? MessageKeys.REGISTRATION_SUCCESS
      : MessageKeys.REGISTRATION_SUCCESS_EMAIL_DELAYED;

    const translatedResponse = this.i18nService.translate(
      messageKey,
      acceptLanguage,
    );

    return {
      code: translatedResponse.code,
      message: translatedResponse.message,
      data: {
        userId: result.user.id,
        tenantId: result.tenant.id,
        email: result.user.email,
        redirectUrl: '/login',
      },
    };
  }

  /**
   * Validate email uniqueness across the entire platform (BR01)
   * Alternative Flow 3a: Email Already Exists
   */
  private async validateEmailUniqueness(
    email: string,
    acceptLanguage?: string,
  ): Promise<void> {
    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      const translatedResponse = this.i18nService.translate(
        MessageKeys.EMAIL_ALREADY_EXISTS,
        acceptLanguage,
      );

      throw new ConflictException({
        code: translatedResponse.code,
        message: translatedResponse.message,
        errors: [
          {
            field: 'email',
            code: translatedResponse.code,
            message: translatedResponse.message,
          },
        ],
      });
    }
  }

  /**
   * Create new tenant organization (Step 9)
   * BR02: Each registration creates exactly one new tenant
   */
  private async createTenant(
    registerDto: RegisterUserRequestDto,
    manager: EntityManager,
  ): Promise<Tenant> {
    const tenant = manager.create(Tenant, {
      companyName: registerDto.companyName,
      language: registerDto.language,
      locale: registerDto.locale,
      status: TenantStatus.ACTIVE,
      maxUsers: 10, // Default value
    });

    return await manager.save(tenant);
  }

  /**
   * Create user account (Step 10)
   */
  private async createUser(
    registerDto: RegisterUserRequestDto,
    tenant: Tenant,
    manager: EntityManager,
  ): Promise<User> {
    // Hash password using bcrypt with minimum 12 rounds (BR06)
    const passwordHash = await bcrypt.hash(
      registerDto.password,
      this.saltRounds,
    );

    const user = manager.create(User, {
      tenantId: tenant.id,
      fullName: registerDto.fullName,
      email: registerDto.email.toLowerCase(),
      passwordHash,
      status: UserStatus.PENDING_VERIFICATION,
      loginAttempts: 0,
    });

    return await manager.save(user);
  }

  /**
   * Assign Tenant Owner role to the registering user
   * BR03: The registering user automatically becomes the Tenant Owner
   */
  private async assignTenantOwnerRole(
    user: User,
    tenant: Tenant,
    manager: EntityManager,
  ): Promise<void> {
    // Get or create Tenant Owner role
    let tenantOwnerRole = await manager.findOne(Role, {
      where: { name: RoleName.TENANT_OWNER },
    });

    if (!tenantOwnerRole) {
      tenantOwnerRole = manager.create(Role, {
        name: RoleName.TENANT_OWNER,
        description: 'Tenant Owner with full administrative privileges',
        isSystemRole: true,
        isActive: true,
      });
      tenantOwnerRole = await manager.save(tenantOwnerRole);
    }

    // Create user role assignment
    const userRole = manager.create(UserRole, {
      userId: user.id,
      roleId: tenantOwnerRole.id,
      tenantId: tenant.id,
      assignedReason: 'Automatic assignment during registration',
      isActive: true,
    });

    await manager.save(userRole);
  }

  /**
   * Create email verification record (Part of Step 12)
   */
  private async createEmailVerificationRecord(
    user: User,
    manager: EntityManager,
  ): Promise<string> {
    // Generate verification token
    const verificationToken = this.emailService.generateVerificationToken();

    // Create email verification record within transaction
    const emailVerification = manager.create(EmailVerification, {
      userId: user.id,
      token: verificationToken,
      status: EmailVerificationStatus.PENDING,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      attempts: 0,
    });

    await manager.save(emailVerification);
    return verificationToken;
  }

  /**
   * Send verification email (Step 12)
   * Exception Flow 4b: Email Service Unavailable
   */
  private async sendVerificationEmail(
    user: User,
    verificationToken: string,
  ): Promise<void> {
    try {
      // Check if email service is available
      const isEmailServiceAvailable =
        await this.emailService.isEmailServiceAvailable();

      if (!isEmailServiceAvailable) {
        this.logger.warn(
          `Email service unavailable during registration for user ${user.email}`,
        );
        // Continue with registration but log the email failure
        // The success message will indicate delayed email delivery
        return;
      }

      // Send verification email
      await this.emailService.sendVerificationEmail(user, verificationToken);
    } catch (error) {
      this.logger.error(
        `Failed to send verification email for user ${user.email}`,
        error,
      );
      // Don't throw error - allow registration to complete
      // This implements Exception Flow 4b
    }
  }

  /**
   * User Login Authentication
   * Implements ? - User Login Authentication & ? - User Login with Role-Based Access
   */
  async login(
    loginDto: LoginRequestDto,
    ipAddress: string,
    userAgent?: string,
    acceptLanguage?: string,
  ): Promise<LoginResponseDto> {
    try {
      // Step 1-6: Form handling and input (handled by controller)

      // Alternative Flow 3a: Invalid Email Format (handled by DTO validation)

      // Exception Flow 4a: Rate Limit Exceeded (BR11)
      await this.checkRateLimit(ipAddress, acceptLanguage);

      // Step 7: System validates email format (handled by DTO validation)

      // Step 8: System locates user account by email
      const user = await this.findUserByEmail(loginDto.email);

      // Alternative Flow 3b: User Not Found
      if (!user) {
        await this.logFailedLoginAttempt(
          loginDto.email,
          ipAddress,
          userAgent,
          'failed_user_not_found',
          'User not found',
        );
        const translatedResponse = this.i18nService.translate(
          MessageKeys.INVALID_CREDENTIALS,
          acceptLanguage,
        );
        throw new UnauthorizedException(translatedResponse);
      }

      // Alternative Flow 3d: Account Temporarily Locked (BR12)
      await this.checkAccountLockStatus(user, acceptLanguage);

      // ?: Check account status (E3: Deactivated User Account)
      if (
        user.status === UserStatus.INACTIVE ||
        user.status === UserStatus.SUSPENDED
      ) {
        await this.logFailedLoginAttempt(
          loginDto.email,
          ipAddress,
          userAgent,
          'failed_account_locked',
          'Account deactivated',
        );
        const translatedResponse = this.i18nService.translate(
          MessageKeys.ACCOUNT_DEACTIVATED,
          acceptLanguage,
        );
        throw new ForbiddenException(translatedResponse);
      }

      // ?: Check tenant status (E5: Tenant Account Issues)
      const tenant = await this.tenantRepository.findOne({
        where: { id: user.tenantId },
      });
      if (!tenant) {
        const translatedResponse = this.i18nService.translate(
          MessageKeys.TENANT_NOT_FOUND,
          acceptLanguage,
        );
        throw new ForbiddenException(translatedResponse);
      }

      if (tenant.status === TenantStatus.SUSPENDED) {
        await this.logFailedLoginAttempt(
          loginDto.email,
          ipAddress,
          userAgent,
          'failed_rate_limited',
          'Tenant suspended',
        );
        const translatedResponse = this.i18nService.translate(
          MessageKeys.TENANT_SUSPENDED,
          acceptLanguage,
        );
        throw new ForbiddenException(translatedResponse);
      }

      if (tenant.status === TenantStatus.INACTIVE) {
        await this.logFailedLoginAttempt(
          loginDto.email,
          ipAddress,
          userAgent,
          'failed_rate_limited',
          'Tenant inactive',
        );
        const translatedResponse = this.i18nService.translate(
          MessageKeys.TENANT_INACTIVE,
          acceptLanguage,
        );
        throw new ForbiddenException(translatedResponse);
      }

      // Step 9: System verifies password against stored hash
      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        user.passwordHash,
      );

      // Alternative Flow 3c: Invalid Password
      if (!isPasswordValid) {
        await this.handleFailedLogin(
          user,
          ipAddress,
          userAgent,
          acceptLanguage,
        );
        const translatedResponse = this.i18nService.translate(
          MessageKeys.INVALID_CREDENTIALS,
          acceptLanguage,
        );
        throw new UnauthorizedException(translatedResponse);
      }

      // ?: A1 - Check for temporary password requirement
      if (user.passwordResetRequired) {
        const translatedResponse = this.i18nService.translate(
          MessageKeys.PASSWORD_RESET_REQUIRED,
          acceptLanguage,
        );

        // Create a temporary session for the mandatory password change flow
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const sessionExpiresAt = new Date();
        sessionExpiresAt.setHours(sessionExpiresAt.getHours() + 1); // 1 hour for password change

        // Create session record for password reset flow
        const session = this.userSessionRepository.create({
          userId: user.id,
          tenantId: tenant.id,
          sessionToken,
          ipAddress,
          userAgent: userAgent || 'unknown',
          expiresAt: sessionExpiresAt,
          status: 'active',
          lastActivityAt: new Date(),
          loginMethod: 'password_reset', // Use password_reset method for temp sessions
        });
        await this.userSessionRepository.save(session);

        // Return successful response with mandatory password change flag
        return {
          code: MessageKeys.PASSWORD_RESET_REQUIRED,
          message: translatedResponse.message,
          data: {
            userId: user.id,
            tenantId: tenant.id,
            email: user.email,
            fullName: user.fullName,
            sessionToken,
            sessionExpiresAt: sessionExpiresAt.toISOString(),
            redirectUrl: '/auth/change-password',
            // Standard LoginResponseDataDto fields with default values
            roleName: 'temporary',
            permissions: [],
            rememberMeEnabled: false,
          },
        };
      }

      // Step 10-13: Create session and handle successful login with role-based data
      return await this.handleSuccessfulLogin(
        user,
        tenant,
        ipAddress,
        userAgent,
        loginDto.rememberMe,
        acceptLanguage,
      );
    } catch (error) {
      // Exception Flow 4b: Database Connection Error
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        this.logger.error('Database connection error during login', error);
        const translatedResponse = this.i18nService.translate(
          MessageKeys.DATABASE_CONNECTION_ERROR,
          acceptLanguage,
        );
        throw new InternalServerErrorException(translatedResponse);
      }

      // Re-throw known errors
      throw error;
    }
  }

  /**
   * User Logout
   * Implements ? - User Logout
   */
  async logout(
    sessionToken: string,
    acceptLanguage?: string,
  ): Promise<LogoutResponseDto> {
    try {
      // Step 4: System invalidates current session
      const session = await this.userSessionRepository.findOne({
        where: { sessionToken, status: 'active' },
      });

      // Alternative Flow 3a: Session Already Expired
      if (!session || session.expiresAt < new Date()) {
        this.logger.warn(
          `Logout attempt with expired/invalid session: ${sessionToken}`,
        );

        // Step 5: System clears any remaining browser data (handled by frontend)
        // Continue with logout process even if session is expired
      } else {
        // Update session status to logged_out
        await this.userSessionRepository.update(
          { id: session.id },
          {
            status: 'logged_out',
            lastActivityAt: new Date(),
          },
        );

        // Step 6: System logs logout event
        this.logger.log(`User logout successful for session: ${sessionToken}`);
      }

      // Step 8: Return success response
      const translatedResponse = this.i18nService.translate(
        MessageKeys.LOGOUT_SUCCESS,
        acceptLanguage,
      );

      return {
        code: MessageKeys.LOGOUT_SUCCESS,
        message: translatedResponse.message,
      };
    } catch (error) {
      this.logger.error('Logout error', error);

      // Even if logout fails, return success for security
      const translatedResponse = this.i18nService.translate(
        MessageKeys.LOGOUT_SUCCESS,
        acceptLanguage,
      );

      return {
        code: MessageKeys.LOGOUT_SUCCESS,
        message: translatedResponse.message,
      };
    }
  }

  /**
   * Password Reset Request
   * Implements ? - Password Reset Request
   */
  async requestPasswordReset(
    resetDto: PasswordResetRequestDto,
    ipAddress: string,
    userAgent?: string,
    acceptLanguage?: string,
  ): Promise<PasswordResetRequestResponseDto> {
    try {
      // Step 6: System validates email format (handled by DTO validation)

      // Step 7: System locates user account by email
      const user = await this.findUserByEmail(resetDto.email);

      // Alternative Flow 3a: Email Not Found
      if (!user) {
        // BR19: System always shows success message (security measure)
        this.logger.warn(
          `Password reset requested for non-existent email: ${resetDto.email}`,
        );
        await this.logPasswordResetAttempt(
          null,
          resetDto.email,
          ipAddress,
          userAgent,
          false,
        );

        const translatedResponse = this.i18nService.translate(
          MessageKeys.PASSWORD_RESET_LINK_SENT,
          acceptLanguage,
        );

        return {
          code: MessageKeys.PASSWORD_RESET_LINK_SENT,
          message: translatedResponse.message,
        };
      }

      // Step 8: System generates secure reset token with 2-hour expiration (BR16)
      const resetToken = await this.createPasswordResetToken(
        user,
        ipAddress,
        userAgent,
      );

      // Step 9: System sends password reset email
      await this.sendPasswordResetEmail(user, resetToken);

      // Step 10: System displays success message
      const translatedResponse = this.i18nService.translate(
        MessageKeys.PASSWORD_RESET_LINK_SENT,
        acceptLanguage,
      );

      return {
        code: MessageKeys.PASSWORD_RESET_LINK_SENT,
        message: translatedResponse.message,
      };
    } catch (error) {
      this.logger.error('Password reset request error', error);

      // Alternative Flow 3b: Email Service Unavailable
      // Always return success message for security (BR19)
      const translatedResponse = this.i18nService.translate(
        MessageKeys.PASSWORD_RESET_LINK_SENT,
        acceptLanguage,
      );

      return {
        code: MessageKeys.PASSWORD_RESET_LINK_SENT,
        message: translatedResponse.message,
      };
    }
  }

  /**
   * Password Reset Completion
   * Implements ? - Password Reset Completion
   */
  async completePasswordReset(
    resetDto: PasswordResetCompleteRequestDto,
    ipAddress: string,
    userAgent?: string,
    acceptLanguage?: string,
  ): Promise<PasswordResetCompleteResponseDto> {
    // Step 2-3: System validates reset token and checks expiration
    const resetToken = await this.validatePasswordResetToken(
      resetDto.token,
      acceptLanguage,
    );

    // Step 8-9: System validates new password (handled by DTO validation)

    // Use database transaction for atomicity
    const result = await this.dataSource.transaction(async (manager) => {
      // Step 10: System updates user password with new bcrypt hash
      const hashedPassword = await bcrypt.hash(
        resetDto.password,
        this.saltRounds,
      );

      await manager.update(
        User,
        { id: resetToken.userId },
        {
          passwordHash: hashedPassword,
          passwordChangedAt: new Date(),
          loginAttempts: 0, // Reset failed attempts
          lockedUntil: undefined, // Unlock account if locked
          lockReason: undefined,
        },
      );

      // Step 11: System invalidates reset token (BR17)
      await manager.update(
        PasswordResetToken,
        { id: resetToken.id },
        {
          status: 'used',
          usedAt: new Date(),
          usedIpAddress: ipAddress,
          usedUserAgent: userAgent,
        },
      );

      // Step 12: System invalidates all existing user sessions (BR18)
      await manager.update(
        UserSession,
        { userId: resetToken.userId, status: 'active' },
        { status: 'invalidated', lastActivityAt: new Date() },
      );

      return resetToken;
    });

    // Step 13: System logs password reset completion
    this.logger.log(`Password reset completed for user: ${result.userId}`);

    // Step 14-15: Return success message and redirect info
    const translatedResponse = this.i18nService.translate(
      MessageKeys.PASSWORD_RESET_SUCCESS,
      acceptLanguage,
    );

    return {
      code: MessageKeys.PASSWORD_RESET_SUCCESS,
      message: translatedResponse.message,
      data: {
        redirectUrl: '/login',
        language: resetDto.language || 'fa', // Include language from request or default to Persian
      },
    };
  }

  // Helper methods for login functionality

  /**
   * Check rate limiting for IP address (BR11)
   */
  private async checkRateLimit(
    ipAddress: string,
    acceptLanguage?: string,
  ): Promise<void> {
    const windowStart = new Date(
      Date.now() - this.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    );

    const attemptCount = await this.loginAttemptRepository.count({
      where: {
        ipAddress,
        createdAt: MoreThan(windowStart),
        status: 'failed_invalid_credentials',
      },
    });

    if (attemptCount >= this.MAX_ATTEMPTS_PER_IP) {
      this.logger.warn(`Rate limit exceeded for IP: ${ipAddress}`);
      const translatedResponse = this.i18nService.translate(
        MessageKeys.RATE_LIMIT_EXCEEDED,
        acceptLanguage,
      );
      throw new HttpException(translatedResponse, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  /**
   * Find user by email address
   */
  private async findUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
      relations: ['tenant'],
    });
  }

  /**
   * Log failed login attempt for security monitoring
   */
  private async logFailedLoginAttempt(
    email: string,
    ipAddress: string,
    userAgent: string | undefined,
    status: string,
    reason: string,
    userId?: string,
    tenantId?: string,
  ): Promise<void> {
    try {
      const loginAttempt = this.loginAttemptRepository.create({
        userId: userId || undefined,
        email,
        ipAddress,
        userAgent,
        attemptType: 'login',
        status,
        failureReason: reason,
        tenantContext: tenantId || undefined,
      });

      await this.loginAttemptRepository.save(loginAttempt);
    } catch (error) {
      this.logger.error('Failed to log login attempt', error);
    }
  }

  /**
   * Check if account is locked (BR12)
   */
  private async checkAccountLockStatus(
    user: User,
    acceptLanguage?: string,
  ): Promise<void> {
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const timeRemaining = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / (1000 * 60),
      );
      this.logger.warn(`Login attempt on locked account: ${user.email}`);

      const translatedResponse = this.i18nService.translate(
        MessageKeys.ACCOUNT_LOCKED,
        acceptLanguage,
      );

      throw new UnauthorizedException({
        ...translatedResponse,
        data: { lockoutTimeRemaining: timeRemaining },
      });
    }
  }

  /**
   * Handle failed login attempt and check for account locking
   */
  private async handleFailedLogin(
    user: User,
    ipAddress: string,
    userAgent: string | undefined,
    acceptLanguage?: string,
  ): Promise<void> {
    // Increment failed login attempts
    const updatedAttempts = user.loginAttempts + 1;

    const updateData: any = {
      loginAttempts: updatedAttempts,
    };

    // Check if account should be locked (BR12)
    if (updatedAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      updateData.lockedUntil = new Date(
        Date.now() + this.LOCKOUT_DURATION_HOURS * 60 * 60 * 1000,
      );
      updateData.lockReason = this.i18nService.translate(
        MessageKeys.ACCOUNT_LOCKED_REASON,
      ).message;

      this.logger.warn(`Account locked due to failed attempts: ${user.email}`);
    }

    await this.userRepository.update({ id: user.id }, updateData);

    // Log the failed attempt
    await this.logFailedLoginAttempt(
      user.email,
      ipAddress,
      userAgent,
      'failed_invalid_credentials',
      'Invalid password',
      user.id,
      user.tenantId,
    );
  }

  /**
   * Handle successful login and create session with role-based information
   * Enhanced for ? - User Login with Role-Based Access
   */
  private async handleSuccessfulLogin(
    user: User,
    tenant: Tenant,
    ipAddress: string,
    userAgent: string | undefined,
    rememberMe: boolean = false,
    acceptLanguage?: string,
  ): Promise<LoginResponseDto> {
    return await this.dataSource.transaction(async (manager) => {
      // BR14: Only one active session per user account
      await manager.update(
        UserSession,
        { userId: user.id, status: 'active' },
        { status: 'invalidated', lastActivityAt: new Date() },
      );

      // A4: Remember Me Functionality - determine session duration
      const sessionDurationMs = rememberMe
        ? 30 * 24 * 60 * 60 * 1000 // 30 days
        : this.SESSION_DURATION_HOURS * 60 * 60 * 1000; // 8 hours

      // Create new session
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + sessionDurationMs);

      const session = manager.create(UserSession, {
        userId: user.id,
        tenantId: user.tenantId,
        sessionToken,
        ipAddress,
        userAgent,
        status: 'active',
        lastActivityAt: new Date(),
        expiresAt,
        loginMethod: 'email_password',
      });

      const savedSession = await manager.save(session);

      // Update user login info and reset failed attempts
      await manager.update(
        User,
        { id: user.id },
        {
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress,
          loginAttempts: 0,
          lockedUntil: undefined,
          lockReason: undefined,
        },
      );

      // Log successful attempt
      const successAttempt = manager.create(LoginAttempt, {
        userId: user.id,
        email: user.email,
        ipAddress,
        userAgent,
        attemptType: 'login',
        status: 'success',
        tenantContext: user.tenantId,
        sessionCreated: savedSession.id,
      });

      await manager.save(successAttempt);

      // Get user role information for role-based response
      const userRole = await manager.findOne(UserRole, {
        where: { userId: user.id, isActive: true },
        relations: ['role'],
      });

      if (!userRole || !userRole.role) {
        throw new InternalServerErrorException('User role not found');
      }

      const roleName = userRole.role.name;

      // A2: Role-Based Dashboard Redirection & get dynamic permissions from database
      const redirectUrl = this.getRoleBasedRedirectUrl(roleName);
      const permissions = await this.permissionsService.getUserPermissions(
        user.id,
        user.tenantId,
      );

      // Return success response
      const translatedResponse = this.i18nService.translate(
        MessageKeys.LOGIN_SUCCESS,
        acceptLanguage,
      );

      return {
        code: MessageKeys.LOGIN_SUCCESS,
        message: translatedResponse.message,
        data: {
          userId: user.id,
          tenantId: user.tenantId,
          email: user.email,
          fullName: user.fullName,
          roleName: roleName,
          permissions: permissions,
          redirectUrl: redirectUrl,
          sessionExpiresAt: expiresAt.toISOString(),
          sessionToken: sessionToken,
          rememberMeEnabled: rememberMe,
        },
      };
    });
  }

  /**
   * Get role-based redirect URL for dashboard
   * Implements A2: Role-Based Dashboard Redirection from ?
   */
  private getRoleBasedRedirectUrl(roleName: string): string {
    switch (roleName) {
      case 'tenant_owner':
        return '/dashboard/owner';
      case 'admin':
        return '/dashboard/admin';
      case 'manager':
        return '/dashboard/manager';
      case 'employee':
        return '/dashboard/employee';
      case 'staff':
        return '/dashboard/staff';
      default:
        return '/dashboard';
    }
  }

  /**
   * Log password reset attempt for security monitoring
   */
  private async logPasswordResetAttempt(
    userId: string | null,
    email: string,
    ipAddress: string,
    userAgent: string | undefined,
    success: boolean,
  ): Promise<void> {
    try {
      const loginAttempt = this.loginAttemptRepository.create({
        userId: userId || undefined,
        email,
        ipAddress,
        userAgent,
        attemptType: 'password_reset',
        status: success ? 'success' : 'failed_user_not_found',
        failureReason: success ? undefined : 'Email not found',
      });

      await this.loginAttemptRepository.save(loginAttempt);
    } catch (error) {
      this.logger.error('Failed to log password reset attempt', error);
    }
  }

  /**
   * Create password reset token (BR16, BR17)
   */
  private async createPasswordResetToken(
    user: User,
    ipAddress: string,
    userAgent?: string,
  ): Promise<string> {
    return await this.dataSource.transaction(async (manager) => {
      // BR17: Only one active reset token per user
      await manager.update(
        PasswordResetToken,
        { userId: user.id, status: 'pending' },
        {
          status: 'invalidated',
          invalidatedReason: 'New reset request',
        },
      );

      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(
        Date.now() + this.RESET_TOKEN_DURATION_HOURS * 60 * 60 * 1000,
      );

      const resetToken = manager.create(PasswordResetToken, {
        userId: user.id,
        token,
        tokenHash,
        status: 'pending',
        ipAddress,
        userAgent,
        expiresAt,
      });

      await manager.save(resetToken);
      return token;
    });
  }

  /**
   * Send password reset email
   */
  private async sendPasswordResetEmail(
    user: User,
    token: string,
  ): Promise<void> {
    try {
      // Check if email service is available
      const isEmailServiceAvailable =
        await this.emailService.isEmailServiceAvailable();

      if (!isEmailServiceAvailable) {
        this.logger.warn(
          `Email service unavailable for password reset: ${user.email}`,
        );
        return;
      }

      // Send password reset email (this method needs to be implemented in EmailService)
      await this.emailService.sendPasswordResetEmail(user, token);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email for user ${user.email}`,
        error,
      );
      // Don't throw error - continue with reset process
    }
  }

  /**
   * Validate password reset token
   */
  private async validatePasswordResetToken(
    token: string,
    acceptLanguage?: string,
  ): Promise<PasswordResetToken> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: { tokenHash, status: 'pending' },
      relations: ['user'],
    });

    // Alternative Flow 3a: Invalid or Expired Token
    if (!resetToken) {
      const translatedResponse = this.i18nService.translate(
        MessageKeys.INVALID_RESET_TOKEN,
        acceptLanguage,
      );
      throw new BadRequestException(translatedResponse);
    }

    // Check token expiration (BR16)
    if (resetToken.expiresAt < new Date()) {
      const translatedResponse = this.i18nService.translate(
        MessageKeys.EXPIRED_RESET_TOKEN,
        acceptLanguage,
      );
      throw new BadRequestException(translatedResponse);
    }

    return resetToken;
  }

  /**
   * Email Verification Process
   * Implements ? - Email Verification After Registration
   */
  async verifyEmail(
    token: string,
    ipAddress: string,
    userAgent?: string,
    acceptLanguage?: string,
    language?: string,
  ): Promise<{ code: string; message: string; data: any }> {
    try {
      // Step 2: System extracts token from URL query parameter (handled by controller)

      // Step 3: System validates token format and structure
      if (!token || typeof token !== 'string') {
        const translatedResponse = this.i18nService.translate(
          MessageKeys.INVALID_VERIFICATION_TOKEN,
          acceptLanguage,
        );
        throw new BadRequestException(translatedResponse);
      }

      // Step 4: System checks token exists in email_verifications table
      const emailVerification = await this.emailVerificationRepository.findOne({
        where: { token },
        relations: ['user', 'user.tenant'],
      });

      if (!emailVerification) {
        const translatedResponse = this.i18nService.translate(
          MessageKeys.INVALID_VERIFICATION_TOKEN,
          acceptLanguage,
        );
        throw new BadRequestException(translatedResponse);
      }

      // Step 5: System verifies token is not expired (within 24 hours)
      if (emailVerification.expiresAt < new Date()) {
        // Alternative Flow 3a: Token Expired
        await this.emailVerificationRepository.update(
          { id: emailVerification.id },
          { status: EmailVerificationStatus.EXPIRED },
        );

        const translatedResponse = this.i18nService.translate(
          MessageKeys.EXPIRED_VERIFICATION_TOKEN,
          acceptLanguage,
        );
        throw new BadRequestException(translatedResponse);
      }

      // Step 6: System checks token status is 'pending'
      if (emailVerification.status === EmailVerificationStatus.VERIFIED) {
        // Alternative Flow 3c: Already Verified
        const translatedResponse = this.i18nService.translate(
          MessageKeys.EMAIL_ALREADY_VERIFIED,
          acceptLanguage,
        );
        throw new BadRequestException(translatedResponse);
      }

      if (emailVerification.status !== EmailVerificationStatus.PENDING) {
        const translatedResponse = this.i18nService.translate(
          MessageKeys.INVALID_VERIFICATION_TOKEN,
          acceptLanguage,
        );
        throw new BadRequestException(translatedResponse);
      }

      // Use database transaction for atomicity
      const result = await this.dataSource.transaction(async (manager) => {
        // Step 7: System updates email verification status to 'verified'
        // Step 8: System sets verified_at timestamp
        // Step 10: System logs verification attempt with IP address and user agent
        await manager.update(
          EmailVerification,
          { id: emailVerification.id },
          {
            status: EmailVerificationStatus.VERIFIED,
            verifiedAt: new Date(),
            attempts: emailVerification.attempts + 1,
            lastAttemptAt: new Date(),
            ipAddress,
            userAgent,
          },
        );

        // Step 9: System updates user status from 'pending_verification' to 'active'
        await manager.update(
          User,
          { id: emailVerification.userId },
          {
            status: UserStatus.ACTIVE,
            emailVerifiedAt: new Date(),
          },
        );

        return emailVerification;
      });

      // Step 11: System displays success message
      const translatedResponse = this.i18nService.translate(
        MessageKeys.EMAIL_VERIFIED_SUCCESS,
        acceptLanguage,
      );

      // Step 12: System redirects user to login page with success notification
      return {
        code: MessageKeys.EMAIL_VERIFIED_SUCCESS,
        message: translatedResponse.message,
        data: {
          userId: result.userId,
          email: result.user.email,
          verifiedAt: new Date().toISOString(),
          redirectUrl: '/login',
          language: language || 'fa', // Include language from query param or default to Persian
        },
      };
    } catch (error) {
      // If it's a known error, re-throw it
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Email verification error', error);

      // Generic error handling
      const translatedResponse = this.i18nService.translate(
        MessageKeys.VERIFICATION_TEMPORARILY_UNAVAILABLE,
        acceptLanguage,
      );
      throw new InternalServerErrorException(translatedResponse);
    }
  }

  /**
   * Resend Email Verification
   * Implements ? - Alternative Flow 3a: Token Expired - Resend verification
   */
  async resendEmailVerification(
    email: string,
    ipAddress: string,
    userAgent?: string,
    acceptLanguage?: string,
  ): Promise<{ code: string; message: string; data: any }> {
    try {
      // Step 5: System validates email exists and is unverified
      const user = await this.userRepository.findOne({
        where: { email: email.toLowerCase() },
        relations: ['emailVerifications', 'tenant'],
      });

      if (!user) {
        // For security, always return success even if email doesn't exist
        const translatedResponse = this.i18nService.translate(
          MessageKeys.VERIFICATION_EMAIL_SENT_SUCCESS,
          acceptLanguage,
        );
        return {
          code: MessageKeys.VERIFICATION_EMAIL_SENT_SUCCESS,
          message: translatedResponse.message,
          data: {
            email,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
        };
      }

      // Check if email is already verified
      if (user.status === UserStatus.ACTIVE && user.emailVerifiedAt) {
        const translatedResponse = this.i18nService.translate(
          MessageKeys.EMAIL_ALREADY_VERIFIED,
          acceptLanguage,
        );
        throw new BadRequestException(translatedResponse);
      }

      // Check for too many attempts
      const recentAttempts = await this.emailVerificationRepository.count({
        where: {
          userId: user.id,
          createdAt: MoreThan(new Date(Date.now() - 15 * 60 * 1000)), // Last 15 minutes
        },
      });

      if (recentAttempts >= 3) {
        const translatedResponse = this.i18nService.translate(
          MessageKeys.TOO_MANY_VERIFICATION_ATTEMPTS,
          acceptLanguage,
        );
        throw new BadRequestException(translatedResponse);
      }

      // Use database transaction for atomicity
      const result = await this.dataSource.transaction(async (manager) => {
        // Step 6: System generates new verification token
        const verificationToken = this.emailService.generateVerificationToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Invalidate existing pending tokens
        await manager.update(
          EmailVerification,
          { userId: user.id, status: EmailVerificationStatus.PENDING },
          { status: EmailVerificationStatus.EXPIRED },
        );

        // Create new email verification record
        const emailVerification = manager.create(EmailVerification, {
          userId: user.id,
          token: verificationToken,
          status: EmailVerificationStatus.PENDING,
          expiresAt,
          attempts: 0,
          ipAddress,
          userAgent,
        });

        await manager.save(emailVerification);

        return {
          token: verificationToken,
          expiresAt,
        };
      });

      // Step 7: System sends new verification email
      try {
        await this.emailService.sendVerificationEmail(user, result.token);
      } catch (emailError) {
        this.logger.warn('Failed to send verification email', emailError);
        // Continue with success response even if email fails
      }

      // Step 8: System displays success message
      const translatedResponse = this.i18nService.translate(
        MessageKeys.VERIFICATION_EMAIL_SENT_SUCCESS,
        acceptLanguage,
      );

      return {
        code: MessageKeys.VERIFICATION_EMAIL_SENT_SUCCESS,
        message: translatedResponse.message,
        data: {
          email: user.email,
          expiresAt: result.expiresAt.toISOString(),
        },
      };
    } catch (error) {
      // If it's a known error, re-throw it
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Resend verification error', error);

      // Generic error handling
      const translatedResponse = this.i18nService.translate(
        MessageKeys.VERIFICATION_TEMPORARILY_UNAVAILABLE,
        acceptLanguage,
      );
      throw new InternalServerErrorException(translatedResponse);
    }
  }
}
