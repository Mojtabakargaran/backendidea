import {
  Injectable,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, DataSource, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '@/entities/user.entity';
import { Role } from '@/entities/role.entity';
import { UserRole } from '@/entities/user-role.entity';
import { AuditLog } from '@/entities/audit-log.entity';
import { EmailVerification } from '@/entities/email-verification.entity';
import { Tenant } from '@/entities/tenant.entity';
import { CreateUserRequestDto } from '../dto/create-user-request.dto';
import { UpdateUserRequestDto } from '../dto/update-user-request.dto';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';
import { MessageKeys } from '@/common/message-keys';
import {
  UserStatus,
  RoleName,
  AuditAction,
  AuditStatus,
  EmailVerificationStatus,
  Language,
} from '@/common/enums';
import { EmailService } from '@/auth/services/email.service';
import { I18nService } from '@/i18n/i18n.service';
import { UserSession } from '@/entities/user-session.entity';
import { PasswordResetToken } from '@/entities/password-reset-token.entity';
import { PermissionsService } from '@/permissions/permissions.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(EmailVerification)
    private readonly emailVerificationRepository: Repository<EmailVerification>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(UserSession)
    private readonly userSessionRepository: Repository<UserSession>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
    private readonly i18nService: I18nService,
    private readonly configService: ConfigService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async createUser(
    createUserDto: CreateUserRequestDto,
    actorUserId: string,
    tenantId: string,
    ipAddress: string,
    userAgent: string,
    acceptLanguage: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate permissions
      await this.validateUserCreationPermissions(
        actorUserId,
        createUserDto.roleId,
        tenantId,
      );

      // Check email uniqueness within tenant
      await this.checkEmailUniqueness(createUserDto.email, tenantId);

      // Validate role exists and is active
      const role = await this.validateAndGetRole(createUserDto.roleId);

      // Generate password if needed
      let password = createUserDto.password;
      let generatedPassword: string | undefined;

      if (createUserDto.generatePassword || !password) {
        generatedPassword = this.generateSecurePassword();
        password = generatedPassword;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Get tenant for default settings
      const tenant = await this.getTenant(tenantId);

      // Create user
      const user = queryRunner.manager.create(User, {
        tenantId,
        fullName: createUserDto.fullName,
        email: createUserDto.email,
        phoneNumber: createUserDto.phoneNumber,
        passwordHash,
        status: createUserDto.status || UserStatus.ACTIVE,
      });

      const savedUser = await queryRunner.manager.save(User, user);

      // Create user role assignment
      const userRole = queryRunner.manager.create(UserRole, {
        userId: savedUser.id,
        roleId: createUserDto.roleId,
        tenantId,
        assignedBy: actorUserId,
        assignedReason: this.i18nService.translate(MessageKeys.USER_CREATION_ASSIGNMENT).message,
        isActive: true,
      });

      await queryRunner.manager.save(UserRole, userRole);

      // Create email verification if user is active
      let welcomeEmailSent = false;
      if (savedUser.status === UserStatus.ACTIVE) {
        try {
          await this.createEmailVerification(savedUser, queryRunner.manager);
          // Only send welcome email if we have a password to share
          if (generatedPassword) {
            await this.sendWelcomeEmail(
              savedUser,
              generatedPassword,
              tenant,
              acceptLanguage,
            );
          }
          welcomeEmailSent = true;
        } catch (emailError) {
          this.logger.warn(
            `Welcome email failed for user ${savedUser.id}:`,
            emailError,
          );
          // Don't fail transaction for email issues
        }
      }

      // Create audit log
      await this.createAuditLog(
        tenantId,
        actorUserId,
        savedUser.id,
        AuditAction.USER_CREATED,
        AuditStatus.SUCCESS,
        `User created with role ${role.name}`,
        ipAddress,
        userAgent,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();

      return {
        userId: savedUser.id,
        fullName: savedUser.fullName,
        email: savedUser.email,
        status: savedUser.status,
        roleId: role.id,
        roleName: role.name,
        welcomeEmailSent,
        generatedPassword,
        createdAt: savedUser.createdAt.toISOString(),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      // Create audit log for failed attempt
      try {
        await this.createAuditLog(
          tenantId,
          actorUserId,
          undefined,
          AuditAction.USER_CREATED,
          AuditStatus.FAILED,
          undefined,
          ipAddress,
          userAgent,
          undefined, // Use default repository instead of transaction manager after rollback
          error.message,
        );
      } catch (auditError) {
        this.logger.error(
          'Failed to create audit log for failed user creation:',
          auditError,
        );
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async validateUserCreationPermissions(
    actorUserId: string,
    targetRoleId: string,
    tenantId: string,
  ): Promise<void> {
    // Get actor's roles
    const actorRoles = await this.userRoleRepository.find({
      where: { userId: actorUserId, tenantId, isActive: true },
      relations: ['role'],
    });

    if (!actorRoles.length) {
      throw new ForbiddenException({
        code: MessageKeys.INSUFFICIENT_PERMISSIONS,
      });
    }

    const actorRoleNames = actorRoles.map((ur) => ur.role.name);
    const targetRole = await this.roleRepository.findOne({
      where: { id: targetRoleId },
    });

    if (!targetRole) {
      throw new BadRequestException({
        code: MessageKeys.INVALID_ROLE_ASSIGNMENT,
      });
    }

    // BR02: Role Assignment Restrictions
    const canCreateUsers = actorRoleNames.some((role) =>
      [RoleName.TENANT_OWNER, RoleName.ADMIN].includes(role),
    );

    if (!canCreateUsers) {
      throw new ForbiddenException({
        code: MessageKeys.INSUFFICIENT_PERMISSIONS,
      });
    }

    // Admins can only assign Employee and Staff roles
    if (
      actorRoleNames.includes(RoleName.ADMIN) &&
      !actorRoleNames.includes(RoleName.TENANT_OWNER)
    ) {
      const allowedRoles = [RoleName.EMPLOYEE, RoleName.STAFF];
      if (!allowedRoles.includes(targetRole.name)) {
        throw new ForbiddenException({
          code: MessageKeys.ROLE_ASSIGNMENT_RESTRICTED,
        });
      }
    }
  }

  private async checkEmailUniqueness(
    email: string,
    tenantId: string,
  ): Promise<void> {
    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase(), tenantId },
    });

    if (existingUser) {
      throw new ConflictException({
        code: MessageKeys.EMAIL_ALREADY_EXISTS_IN_TENANT,
      });
    }
  }

  private async validateAndGetRole(roleId: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId, isActive: true },
    });

    if (!role) {
      throw new BadRequestException({
        code: MessageKeys.INVALID_ROLE_ASSIGNMENT,
      });
    }

    return role;
  }

  /**
   * Validate role assignment permissions for user updates based on role hierarchy
   */
  private async validateRoleAssignmentForUpdate(
    actorRoleName: string,
    targetRoleId: string,
    tenantId: string,
  ): Promise<void> {
    const targetRole = await this.roleRepository.findOne({
      where: { id: targetRoleId },
    });

    if (!targetRole) {
      throw new BadRequestException({
        code: MessageKeys.INVALID_ROLE_ASSIGNMENT,
      });
    }

    // Role hierarchy validation based on user requirements
    // Only users with roles that can assign other roles are allowed
    const canAssignRoles = [
      RoleName.TENANT_OWNER,
      RoleName.ADMIN,
      RoleName.MANAGER,
      RoleName.EMPLOYEE,
    ].includes(actorRoleName as RoleName);

    if (!canAssignRoles) {
      throw new ForbiddenException({
        code: MessageKeys.INSUFFICIENT_PERMISSIONS,
      });
    }

    // Implement role hierarchy: users can only assign roles equal to or lower than allowed by their level
    const roleHierarchyPermissions = {
      [RoleName.TENANT_OWNER]: [
        RoleName.ADMIN,
        RoleName.MANAGER,
        RoleName.EMPLOYEE,
        RoleName.STAFF,
      ],
      [RoleName.ADMIN]: [RoleName.MANAGER, RoleName.EMPLOYEE, RoleName.STAFF],
      [RoleName.MANAGER]: [RoleName.EMPLOYEE, RoleName.STAFF],
      [RoleName.EMPLOYEE]: [RoleName.STAFF],
    };

    const allowedRoles = roleHierarchyPermissions[actorRoleName as RoleName];
    if (!allowedRoles || !allowedRoles.includes(targetRole.name as RoleName)) {
      throw new ForbiddenException({
        code: MessageKeys.ROLE_ASSIGNMENT_RESTRICTED,
      });
    }
  }

  private generateSecurePassword(): string {
    const length = 12;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '@$!%*?&';

    // Ensure at least one character from each category
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest randomly
    const allChars = uppercase + lowercase + numbers + symbols;
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  private async getTenant(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new InternalServerErrorException({
        code: MessageKeys.TENANT_NOT_FOUND,
      });
    }
    return tenant;
  }

  private async createEmailVerification(user: User, manager?: any) {
    const repository = manager || this.emailVerificationRepository;

    // Invalidate any existing pending verification
    await repository.update(
      { userId: user.id, status: EmailVerificationStatus.PENDING },
      { status: EmailVerificationStatus.EXPIRED },
    );

    // Create new verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

    const verification = repository.create({
      userId: user.id,
      token,
      status: EmailVerificationStatus.PENDING,
      expiresAt,
    });

    await repository.save(verification);
    return verification;
  }

  private async sendWelcomeEmail(
    user: User,
    password: string,
    tenant: Tenant,
    acceptLanguage: string,
  ): Promise<void> {
    const emailData = {
      name: user.fullName,
      email: user.email,
      password,
      loginUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
      companyName: tenant.companyName,
    };

    // Extract simple language code (fa, ar, en) from accept-language header
    let language = 'fa'; // default
    if (acceptLanguage) {
      if (acceptLanguage.includes('ar')) {
        language = 'ar';
      } else if (acceptLanguage.includes('en')) {
        language = 'en';
      } else if (acceptLanguage.includes('fa')) {
        language = 'fa';
      }
    }

    await this.emailService.sendWelcomeEmail(
      user.email,
      '',
      emailData,
      language,
    );
  }

  private async createAuditLog(
    tenantId: string,
    actorUserId: string,
    targetUserId: string | undefined,
    action: AuditAction,
    status: AuditStatus,
    details?: string,
    ipAddress?: string,
    userAgent?: string,
    manager?: any,
    failureReason?: string,
  ): Promise<void> {
    const repository = manager || this.auditLogRepository;

    const auditLog = repository.metadata 
      ? repository.create({
          tenantId,
          actorUserId,
          targetUserId,
          action,
          status,
          details,
          failureReason,
          ipAddress,
          userAgent,
        })
      : manager.create(AuditLog, {
          tenantId,
          actorUserId,
          targetUserId,
          action,
          status,
          details,
          failureReason,
          ipAddress,
          userAgent,
        });

    await repository.save(auditLog);
  }

  async listUsers(
    queryParams: ListUsersQueryDto,
    actorUserId: string,
    tenantId: string,
    acceptLanguage: string,
  ) {
    try {
      // Validate pagination parameters
      if (queryParams.page && queryParams.page < 1) {
        throw new BadRequestException({
          code: MessageKeys.INVALID_PAGE_PARAMETERS,
        });
      }
      if (
        queryParams.limit &&
        (queryParams.limit < 1 || queryParams.limit > 100)
      ) {
        throw new BadRequestException({
          code: MessageKeys.INVALID_PAGE_PARAMETERS,
        });
      }

      // Validate sort field
      const validSortFields = [
        'fullName',
        'email',
        'lastLoginAt',
        'createdAt',
        'status',
      ];
      if (queryParams.sortBy && !validSortFields.includes(queryParams.sortBy)) {
        throw new BadRequestException({ code: MessageKeys.INVALID_SORT_FIELD });
      }

      // Validate date filters
      if (queryParams.lastLoginFrom && queryParams.lastLoginTo) {
        const fromDate = new Date(queryParams.lastLoginFrom);
        const toDate = new Date(queryParams.lastLoginTo);
        if (fromDate > toDate) {
          throw new BadRequestException({
            code: MessageKeys.INVALID_FILTER_CRITERIA,
          });
        }
      }

      // Check permissions - all authenticated users can view user list
      const actorRoles = await this.userRoleRepository.find({
        where: { userId: actorUserId, tenantId, isActive: true },
        relations: ['role'],
      });

      if (!actorRoles.length) {
        throw new ForbiddenException({
          code: MessageKeys.INSUFFICIENT_PERMISSIONS,
        });
      }

      const actorRoleNames = actorRoles.map((ur) => ur.role.name);

      // BR01: Permission-based visibility - all roles can view basic user list
      const canViewUsers = actorRoleNames.some((role) =>
        [
          RoleName.TENANT_OWNER,
          RoleName.ADMIN,
          RoleName.MANAGER,
          RoleName.EMPLOYEE,
          RoleName.STAFF,
        ].includes(role),
      );

      if (!canViewUsers) {
        throw new ForbiddenException({
          code: MessageKeys.INSUFFICIENT_PERMISSIONS,
        });
      }

      // Set defaults
      const page = queryParams.page || 1;
      const limit = queryParams.limit || 25;
      const sortBy = queryParams.sortBy || 'createdAt';
      const sortOrder = queryParams.sortOrder || 'desc';
      const offset = (page - 1) * limit;

      // Build query
      const queryBuilder = this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect(
          'user.userRoles',
          'userRole',
          'userRole.isActive = :isActive AND userRole.tenantId = :tenantId',
          { isActive: true, tenantId },
        )
        .leftJoinAndSelect('userRole.role', 'role')
        .where('user.tenantId = :tenantId', { tenantId });

      // Apply filters
      if (queryParams.search) {
        queryBuilder.andWhere(
          '(LOWER(user.fullName) LIKE :search OR LOWER(user.email) LIKE :search)',
          { search: `%${queryParams.search.toLowerCase()}%` },
        );
      }

      if (queryParams.status) {
        queryBuilder.andWhere('user.status = :status', {
          status: queryParams.status,
        });
      }

      if (queryParams.roleId) {
        queryBuilder.andWhere('role.id = :roleId', {
          roleId: queryParams.roleId,
        });
      }

      if (queryParams.lastLoginFrom) {
        queryBuilder.andWhere('user.lastLoginAt >= :fromDate', {
          fromDate: queryParams.lastLoginFrom,
        });
      }

      if (queryParams.lastLoginTo) {
        queryBuilder.andWhere('user.lastLoginAt <= :toDate', {
          toDate: queryParams.lastLoginTo,
        });
      }

      // Apply sorting
      const orderDirection = sortOrder.toUpperCase() as 'ASC' | 'DESC';

      switch (sortBy) {
        case 'fullName':
          queryBuilder.orderBy('user.fullName', orderDirection);
          break;
        case 'email':
          queryBuilder.orderBy('user.email', orderDirection);
          break;
        case 'lastLoginAt':
          queryBuilder.orderBy('user.lastLoginAt', orderDirection);
          break;
        case 'status':
          queryBuilder.orderBy('user.status', orderDirection);
          break;
        case 'createdAt':
        default:
          queryBuilder.orderBy('user.createdAt', orderDirection);
          break;
      }

      // Get total count
      const totalUsers = await queryBuilder.getCount();

      // Apply pagination and get results
      const users = await queryBuilder.skip(offset).take(limit).getMany();

      // Transform results
      const userListItems = users.map((user) => {
        const activeRole = user.userRoles?.find((ur) => ur.isActive);
        return {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber || null,
          status: user.status,
          roleName: activeRole?.role?.name || null,
          lastLoginAt: user.lastLoginAt?.toISOString() || null,
          createdAt: user.createdAt.toISOString(),
        };
      });

      const totalPages = Math.ceil(totalUsers / limit);

      return {
        users: userListItems,
        pagination: {
          page,
          limit,
          totalUsers,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to list users for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Update user profile information (?)
   * Supports partial updates with permission validation
   */
  async updateUser(
    userId: string,
    updateUserDto: UpdateUserRequestDto,
    actorUserId: string,
    tenantId: string,
    ipAddress: string,
    userAgent: string,
    acceptLanguage: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get the target user with current role
      const targetUser = await this.getUserWithRole(userId, tenantId);
      if (!targetUser) {
        throw new BadRequestException({
          code: MessageKeys.USER_NOT_FOUND,
        });
      }

      // Get actor's role for permission validation
      const actorRole = await this.getUserRole(actorUserId, tenantId);

      // Validate permissions and constraints
      await this.validateUpdatePermissions(
        updateUserDto,
        actorUserId,
        userId,
        actorRole,
        targetUser,
        tenantId,
      );

      // Track changes for audit logging and notifications
      const changes: Record<string, { oldValue: any; newValue: any }> = {};
      const modifiedFields: string[] = [];

      // Update user profile fields
      if (
        updateUserDto.fullName !== undefined &&
        updateUserDto.fullName !== targetUser.fullName
      ) {
        changes.fullName = {
          oldValue: targetUser.fullName,
          newValue: updateUserDto.fullName,
        };
        targetUser.fullName = updateUserDto.fullName;
        modifiedFields.push('fullName');
      }

      if (
        updateUserDto.phoneNumber !== undefined &&
        updateUserDto.phoneNumber !== targetUser.phoneNumber
      ) {
        changes.phoneNumber = {
          oldValue: targetUser.phoneNumber,
          newValue: updateUserDto.phoneNumber,
        };
        targetUser.phoneNumber = updateUserDto.phoneNumber || undefined;
        modifiedFields.push('phoneNumber');
      }

      // Handle status changes
      if (
        updateUserDto.status !== undefined &&
        updateUserDto.status !== targetUser.status
      ) {
        changes.status = {
          oldValue: targetUser.status,
          newValue: updateUserDto.status,
        };
        targetUser.status = updateUserDto.status;
        modifiedFields.push('status');

        // If deactivating user, invalidate all active sessions
        if (updateUserDto.status === UserStatus.INACTIVE) {
          await this.invalidateUserSessions(userId, queryRunner);
        }
      }

      // Handle role changes
      let newRole: Role | null = null;
      if (updateUserDto.roleId !== undefined) {
        const currentActiveRole = targetUser.userRoles?.find(
          (ur) => ur.isActive,
        );
        if (currentActiveRole?.roleId !== updateUserDto.roleId) {
          // Validate new role exists
          newRole = await this.validateAndGetRole(updateUserDto.roleId);

          // Deactivate current role
          if (currentActiveRole) {
            currentActiveRole.isActive = false;
            await queryRunner.manager.save(UserRole, currentActiveRole);

            changes.role = {
              oldValue: currentActiveRole.role?.name,
              newValue: newRole?.name,
            };
          }

          // Check if there's an existing role assignment for the target role (active or inactive)
          let existingRoleAssignment = await queryRunner.manager.findOne(
            UserRole,
            {
              where: {
                userId: targetUser.id,
                roleId: updateUserDto.roleId,
                tenantId,
              },
            },
          );

          if (existingRoleAssignment) {
            // Reactivate the existing role assignment
            existingRoleAssignment.isActive = true;
            existingRoleAssignment.assignedBy = actorUserId;
            await queryRunner.manager.save(UserRole, existingRoleAssignment);
          } else {
            // Create new role assignment
            const userRole = queryRunner.manager.create(UserRole, {
              userId: targetUser.id,
              roleId: updateUserDto.roleId,
              tenantId,
              assignedBy: actorUserId,
              isActive: true,
            });
            await queryRunner.manager.save(UserRole, userRole);
          }
          modifiedFields.push('roleId');
        }
      }

      // Check if any changes were made
      if (modifiedFields.length === 0) {
        throw new BadRequestException({
          code: MessageKeys.NO_CHANGES_DETECTED,
        });
      }

      // Save user changes - remove relations to avoid stale data issues
      const { userRoles, ...userWithoutRelations } = targetUser;
      const updatedUser = await queryRunner.manager.save(User, userWithoutRelations);

      // Log audit entries for each type of change
      await this.logUserUpdateAudit(
        changes,
        actorUserId,
        userId,
        tenantId,
        ipAddress,
        userAgent,
        queryRunner,
      );

      await queryRunner.commitTransaction();

      // Send notification email if significant changes were made
      const notificationSent = await this.sendProfileUpdateNotification(
        updatedUser,
        changes,
        newRole,
        acceptLanguage,
      );

      // Get updated role information for response
      const updatedUserWithRole = await this.getUserWithRole(userId, tenantId);
      const activeRole = updatedUserWithRole?.userRoles?.find(
        (ur) => ur.isActive,
      );

      return {
        userId: updatedUser.id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        status: updatedUser.status,
        roleId: activeRole?.roleId || null,
        roleName: activeRole?.role?.name || null,
        updatedAt: updatedUser.updatedAt.toISOString(),
        modifiedFields,
        notificationSent,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to update user ${userId}:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Validate permissions for user profile updates
   */
  private async validateUpdatePermissions(
    updateDto: any,
    actorUserId: string,
    targetUserId: string,
    actorRole: any,
    targetUser: any,
    tenantId: string,
  ) {
    // FIRST: Check database-level permissions for users:update
    const hasUpdatePermission = await this.permissionsService.hasPermission(
      actorUserId,
      tenantId,
      'users',
      'update' as any, // PermissionAction.UPDATE
    );

    if (!hasUpdatePermission) {
      throw new ForbiddenException({
        code: MessageKeys.INSUFFICIENT_PERMISSIONS,
        message: 'No permission to update users',
      });
    }

    // Prevent self-role modification
    if (actorUserId === targetUserId && updateDto.roleId !== undefined) {
      throw new ForbiddenException({
        code: MessageKeys.CANNOT_MODIFY_OWN_ROLE,
      });
    }

    // Prevent self-status modification
    if (actorUserId === targetUserId && updateDto.status !== undefined) {
      throw new ForbiddenException({
        code: MessageKeys.CANNOT_MODIFY_OWN_STATUS,
      });
    }

    // Role-based permission validation
    if (updateDto.roleId !== undefined) {
      await this.validateRoleAssignmentForUpdate(
        actorRole?.role?.name,
        updateDto.roleId,
        tenantId,
      );
    }

    // Check if actor can edit target user based on role hierarchy
    if (actorUserId !== targetUserId) {
      const targetRole = targetUser.userRoles?.find((ur) => ur.isActive)?.role
        ?.name;
      if (!this.canEditUserWithRole(actorRole?.role?.name, targetRole)) {
        throw new ForbiddenException({
          code: MessageKeys.CANNOT_EDIT_HIGHER_PRIVILEGE_USER,
        });
      }
    }
  }

  /**
   * Check if actor can edit a user with the given target role
   */
  private canEditUserWithRole(actorRole: string, targetRole: string): boolean {
    const roleHierarchy = [
      RoleName.TENANT_OWNER,
      RoleName.ADMIN,
      RoleName.MANAGER,
      RoleName.EMPLOYEE,
      RoleName.STAFF,
    ];

    const actorLevel = roleHierarchy.indexOf(actorRole as RoleName);
    const targetLevel = roleHierarchy.indexOf(targetRole as RoleName);

    // Can only edit users with STRICTLY lower privilege levels (not equal)
    return actorLevel !== -1 && targetLevel !== -1 && actorLevel < targetLevel;
  }

  /**
   * Get user with their active role information
   */
  private async getUserWithRole(userId: string, tenantId: string) {
    return await this.userRepository.findOne({
      where: { id: userId, tenantId },
      relations: ['userRoles', 'userRoles.role'],
    });
  }

  /**
   * Get user's active role
   */
  private async getUserRole(userId: string, tenantId: string) {
    return await this.userRoleRepository.findOne({
      where: { userId, tenantId, isActive: true },
      relations: ['role'],
    });
  }

  /**
   * Invalidate all active sessions for a user
   */
  private async invalidateUserSessions(
    userId: string,
    queryRunner: any,
  ): Promise<number> {
    const result = await queryRunner.manager.update(
      'user_sessions',
      { userId, status: 'active' },
      { status: 'invalidated', updatedAt: new Date() },
    );
    return result.affected || 0;
  }

  /**
   * Log audit entries for user updates
   */
  private async logUserUpdateAudit(
    changes: Record<string, any>,
    actorUserId: string,
    targetUserId: string,
    tenantId: string,
    ipAddress: string,
    userAgent: string,
    queryRunner: any,
  ) {
    for (const [field, change] of Object.entries(changes)) {
      let action = AuditAction.USER_UPDATED;

      if (field === 'status') {
        action = AuditAction.USER_STATUS_CHANGED;
      } else if (field === 'role') {
        action = AuditAction.USER_ROLE_CHANGED;
      }

      const auditLog = queryRunner.manager.create(AuditLog, {
        tenantId,
        actorUserId,
        targetUserId,
        action,
        status: AuditStatus.SUCCESS,
        details: JSON.stringify({
          field,
          oldValue: change.oldValue,
          newValue: change.newValue,
          ipAddress,
          userAgent,
        }),
      });

      await queryRunner.manager.save(AuditLog, auditLog);
    }
  }

  /**
   * Send profile update notification email
   */
  private async sendProfileUpdateNotification(
    user: User,
    changes: Record<string, any>,
    newRole: any,
    acceptLanguage: string,
  ): Promise<boolean> {
    try {
      // Only send notification for significant changes (role or status changes)
      const significantChanges = ['status', 'role'].some(
        (field) => changes[field],
      );

      if (!significantChanges) {
        return false;
      }

      const subject = this.i18nService.translate(
        MessageKeys.EMAIL_PROFILE_UPDATE_SUBJECT,
        acceptLanguage,
      ).message;

      const changesList: string[] = [];
      if (changes.role) {
        changesList.push(
          this.i18nService
            .translate(
              MessageKeys.EMAIL_PROFILE_UPDATE_ROLE_CHANGED,
              acceptLanguage,
            )
            .message.replace('{newRole}', changes.role.newValue),
        );
      }

      if (changes.status) {
        changesList.push(
          this.i18nService
            .translate(
              MessageKeys.EMAIL_PROFILE_UPDATE_STATUS_CHANGED,
              acceptLanguage,
            )
            .message.replace('{newStatus}', changes.status.newValue),
        );
      }

      const emailContent = {
        header: this.i18nService.translate(
          MessageKeys.EMAIL_PROFILE_UPDATE_HEADER,
          acceptLanguage,
        ).message,
        greeting: this.i18nService
          .translate(MessageKeys.EMAIL_PROFILE_UPDATE_HELLO, acceptLanguage)
          .message.replace('{name}', user.fullName),
        notification: this.i18nService.translate(
          MessageKeys.EMAIL_PROFILE_UPDATE_NOTIFICATION,
          acceptLanguage,
        ).message,
        changesTitle: this.i18nService.translate(
          MessageKeys.EMAIL_PROFILE_UPDATE_CHANGES_TITLE,
          acceptLanguage,
        ).message,
        changes: changesList,
        contactSupport: this.i18nService.translate(
          MessageKeys.EMAIL_PROFILE_UPDATE_CONTACT_SUPPORT,
          acceptLanguage,
        ).message,
        footer: this.i18nService.translate(
          MessageKeys.EMAIL_PROFILE_UPDATE_FOOTER,
          acceptLanguage,
        ).message,
      };

      // Determine language code for RTL support - use tenant language preference
      const languageCode = user.tenant?.language
        ? this.getLanguageCode(user.tenant.language)
        : 'fa';

      await this.emailService.sendProfileUpdateEmail(
        user.email,
        subject,
        emailContent,
        languageCode,
      );
      return true;
    } catch (error) {
      this.logger.warn(
        `Failed to send profile update notification to ${user.email}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Admin Password Reset (?)
   * Allows administrators to reset passwords for users within their tenant
   */
  async resetUserPassword(
    targetUserId: string,
    resetMethod: 'admin_reset_link' | 'admin_temporary_password',
    actorUserId: string,
    tenantId: string,
    ipAddress: string,
    userAgent: string,
    acceptLanguage: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate preconditions and permissions
      const { targetUser, actorUser } =
        await this.validatePasswordResetPreconditions(
          targetUserId,
          actorUserId,
          tenantId,
        );

      // Check rate limiting (BR04: Maximum 3 password resets per user per 24-hour period)
      await this.checkPasswordResetRateLimit(targetUserId);

      // Generate password or token based on method
      let temporaryPassword: string | undefined;
      let resetToken: string | undefined;
      let expiresAt: Date;

      if (resetMethod === 'admin_temporary_password') {
        // A1: Generate Temporary Password Method
        temporaryPassword = this.generateSecurePassword();
        const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

        // Update user password and set reset required flag
        await queryRunner.manager.update(User, targetUserId, {
          passwordHash: hashedPassword,
          passwordResetRequired: true,
          passwordResetCount: () => 'password_reset_count + 1',
          lastPasswordResetAt: new Date(),
          passwordChangedAt: new Date(),
        });

        expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      } else {
        // A2: Send Password Reset Link Method
        resetToken = await this.createPasswordResetToken(
          targetUser,
          actorUserId,
          resetMethod,
          ipAddress,
          userAgent,
          queryRunner.manager,
        );

        // Update user reset tracking
        await queryRunner.manager.update(User, targetUserId, {
          passwordResetCount: () => 'password_reset_count + 1',
          lastPasswordResetAt: new Date(),
        });

        expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      }

      // BR05: Invalidate all existing user sessions
      const sessionsInvalidated = await this.invalidateUserSessions(
        targetUserId,
        queryRunner,
      );

      // Create audit log (BR06)
      await this.createAuditLog(
        tenantId,
        actorUserId,
        targetUserId,
        resetMethod === 'admin_temporary_password'
          ? AuditAction.TEMPORARY_PASSWORD_GENERATED
          : AuditAction.PASSWORD_RESET_INITIATED,
        AuditStatus.SUCCESS,
        JSON.stringify({
          resetMethod,
          ipAddress,
          userAgent,
          sessionsInvalidated,
        }),
        ipAddress,
        userAgent,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();

      // Send email notification (BR07: Reset emails must be sent in user's preferred language)
      const emailSent = await this.sendPasswordResetNotification(
        targetUser,
        resetMethod,
        temporaryPassword,
        resetToken,
        acceptLanguage,
      );

      // Return success response
      return {
        userId: targetUserId,
        resetMethod,
        temporaryPassword:
          resetMethod === 'admin_temporary_password'
            ? temporaryPassword
            : undefined,
        expiresAt: expiresAt.toISOString(),
        emailSent,
        sessionsInvalidated,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      // Create audit log for failed attempt
      try {
        await this.createAuditLog(
          tenantId,
          actorUserId,
          targetUserId,
          AuditAction.PASSWORD_RESET_INITIATED,
          AuditStatus.FAILED,
          JSON.stringify({
            resetMethod,
            error: error.message,
            ipAddress,
            userAgent,
          }),
          ipAddress,
          userAgent,
          undefined,
          error.message,
        );
      } catch (auditError) {
        this.logger.error(
          'Failed to create audit log for password reset failure',
          auditError,
        );
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Validate preconditions for password reset (?)
   */
  private async validatePasswordResetPreconditions(
    targetUserId: string,
    actorUserId: string,
    tenantId: string,
  ) {
    // E5: Self-Password Reset Attempt
    if (targetUserId === actorUserId) {
      throw new BadRequestException({
        code: MessageKeys.PASSWORD_RESET_SELF_ATTEMPT,
        message: this.i18nService.translate(
          MessageKeys.PASSWORD_RESET_SELF_ATTEMPT,
        ).message,
      });
    }

    // Find target user
    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId, tenantId },
      relations: ['tenant'],
    });

    if (!targetUser) {
      throw new BadRequestException({
        code: MessageKeys.USER_NOT_FOUND,
        message: this.i18nService.translate(MessageKeys.USER_NOT_FOUND).message,
      });
    }

    // E1: Target User is Deactivated
    if (targetUser.status === UserStatus.INACTIVE) {
      throw new BadRequestException({
        code: MessageKeys.PASSWORD_RESET_USER_DEACTIVATED,
        message: this.i18nService.translate(
          MessageKeys.PASSWORD_RESET_USER_DEACTIVATED,
        ).message,
      });
    }

    // Get actor user and role
    const actorUser = await this.userRepository.findOne({
      where: { id: actorUserId, tenantId },
      relations: ['userRoles', 'userRoles.role'],
    });

    if (!actorUser) {
      throw new ForbiddenException({
        code: MessageKeys.PASSWORD_RESET_INSUFFICIENT_PERMISSIONS,
        message: this.i18nService.translate(
          MessageKeys.PASSWORD_RESET_INSUFFICIENT_PERMISSIONS,
        ).message,
      });
    }

    const actorRoleName = actorUser.userRoles.find((ur) => ur.isActive)?.role
      ?.name;

    // Get target user role
    const targetUserRole = await this.userRoleRepository.findOne({
      where: { userId: targetUserId, tenantId, isActive: true },
      relations: ['role'],
    });

    const targetRoleName = targetUserRole?.role?.name;

    // E2: Insufficient Permissions - BR01: Permission Requirements
    await this.validatePasswordResetPermissions(
      actorRoleName || '',
      targetRoleName || '',
    );

    return { targetUser, actorUser };
  }

  /**
   * Validate password reset permissions (BR01)
   */
  private async validatePasswordResetPermissions(
    actorRoleName: string,
    targetRoleName: string,
  ): Promise<void> {
    // BR01: Only Tenant Owners and Admins can reset passwords
    if (
      ![RoleName.TENANT_OWNER, RoleName.ADMIN].includes(
        actorRoleName as RoleName,
      )
    ) {
      throw new ForbiddenException({
        code: MessageKeys.PASSWORD_RESET_INSUFFICIENT_PERMISSIONS,
        message: this.i18nService.translate(
          MessageKeys.PASSWORD_RESET_INSUFFICIENT_PERMISSIONS,
        ).message,
      });
    }

    // BR01: Admins cannot reset passwords for Tenant Owners or other Admins
    if (
      actorRoleName === RoleName.ADMIN &&
      [RoleName.TENANT_OWNER, RoleName.ADMIN].includes(
        targetRoleName as RoleName,
      )
    ) {
      throw new ForbiddenException({
        code: MessageKeys.PASSWORD_RESET_INSUFFICIENT_PERMISSIONS,
        message: this.i18nService.translate(
          MessageKeys.PASSWORD_RESET_INSUFFICIENT_PERMISSIONS,
        ).message,
      });
    }
  }

  /**
   * Check password reset rate limiting (BR04)
   */
  private async checkPasswordResetRateLimit(
    targetUserId: string,
  ): Promise<void> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentResetCount = await this.passwordResetTokenRepository.count({
      where: {
        userId: targetUserId,
        createdAt: MoreThan(twentyFourHoursAgo),
      },
    });

    // BR04: Maximum 3 password resets per user per 24-hour period
    if (recentResetCount >= 3) {
      throw new BadRequestException({
        code: MessageKeys.PASSWORD_RESET_RATE_LIMITED,
        message: this.i18nService.translate(
          MessageKeys.PASSWORD_RESET_RATE_LIMITED,
        ).message,
      });
    }
  }

  /**
   * Create password reset token for link method (BR03)
   */
  private async createPasswordResetToken(
    user: User,
    initiatedBy: string,
    resetMethod: string,
    ipAddress: string,
    userAgent: string,
    manager: any,
  ): Promise<string> {
    // BR03: Reset tokens must be invalidated if new reset is requested
    await manager.update(
      PasswordResetToken,
      { userId: user.id, status: 'pending' },
      {
        status: 'invalidated',
        invalidatedReason: 'New admin reset request',
      },
    );

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const resetToken = manager.create(PasswordResetToken, {
      userId: user.id,
      token,
      tokenHash,
      resetMethod,
      initiatedBy,
      status: 'pending',
      ipAddress,
      userAgent,
      expiresAt,
    });

    await manager.save(resetToken);
    return token;
  }

  /**
   * Send password reset notification email (BR07)
   */
  private async sendPasswordResetNotification(
    user: User,
    resetMethod: string,
    temporaryPassword: string | undefined,
    resetToken: string | undefined,
    acceptLanguage: string,
  ): Promise<boolean> {
    try {
      if (resetMethod === 'admin_temporary_password') {
        await this.sendAdminTemporaryPasswordEmail(
          user,
          temporaryPassword!,
          acceptLanguage,
        );
      } else {
        await this.sendAdminResetLinkEmail(user, resetToken!, acceptLanguage);
      }
      return true;
    } catch (error) {
      this.logger.warn(
        `Failed to send password reset notification to ${user.email}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Send admin temporary password email
   */
  private async sendAdminTemporaryPasswordEmail(
    user: User,
    temporaryPassword: string,
    acceptLanguage: string,
  ): Promise<void> {
    const languageCode = user.tenant?.language
      ? this.getLanguageCode(user.tenant.language)
      : 'fa';
    const subject = this.i18nService.translate(
      MessageKeys.EMAIL_ADMIN_RESET_SUBJECT,
      languageCode,
    ).message;

    const emailContent = {
      header: this.i18nService.translate(
        MessageKeys.EMAIL_ADMIN_RESET_HEADER,
        languageCode,
      ).message,
      greeting: this.i18nService
        .translate(MessageKeys.EMAIL_ADMIN_RESET_HELLO, languageCode)
        .message.replace('{name}', user.fullName),
      notification: this.i18nService.translate(
        MessageKeys.EMAIL_ADMIN_RESET_NOTIFICATION,
        languageCode,
      ).message,
      temporaryPassword: this.i18nService
        .translate(
          MessageKeys.EMAIL_ADMIN_RESET_TEMPORARY_PASSWORD,
          languageCode,
        )
        .message.replace('{temporaryPassword}', temporaryPassword),
      loginInstructions: this.i18nService.translate(
        MessageKeys.EMAIL_ADMIN_RESET_LOGIN_INSTRUCTIONS,
        languageCode,
      ).message,
      changePasswordNote: this.i18nService.translate(
        MessageKeys.EMAIL_ADMIN_RESET_CHANGE_PASSWORD_NOTE,
        languageCode,
      ).message,
      securityNote: this.i18nService.translate(
        MessageKeys.EMAIL_ADMIN_RESET_SECURITY_NOTE,
        languageCode,
      ).message,
      footer: this.i18nService.translate(
        MessageKeys.EMAIL_ADMIN_RESET_FOOTER,
        languageCode,
      ).message,
    };

    await this.emailService.sendAdminResetPasswordEmail(
      user.email,
      subject,
      emailContent,
      temporaryPassword,
      languageCode,
    );
  }

  /**
   * Send admin reset link email
   */
  private async sendAdminResetLinkEmail(
    user: User,
    resetToken: string,
    acceptLanguage: string,
  ): Promise<void> {
    const languageCode = user.tenant?.language
      ? this.getLanguageCode(user.tenant.language)
      : 'fa';
    const frontendUrl =
      this.configService.get('FRONTEND_URL') || 'http://localhost:3001';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${resetToken}&lang=${languageCode}`;

    const subject = this.i18nService.translate(
      MessageKeys.EMAIL_ADMIN_RESET_SUBJECT,
      languageCode,
    ).message;

    const emailContent = {
      header: this.i18nService.translate(
        MessageKeys.EMAIL_ADMIN_RESET_HEADER,
        languageCode,
      ).message,
      greeting: this.i18nService
        .translate(MessageKeys.EMAIL_ADMIN_RESET_HELLO, languageCode)
        .message.replace('{name}', user.fullName),
      notification: this.i18nService.translate(
        MessageKeys.EMAIL_ADMIN_RESET_NOTIFICATION,
        languageCode,
      ).message,
      linkDescription: this.i18nService.translate(
        MessageKeys.EMAIL_ADMIN_RESET_LINK_DESCRIPTION,
        languageCode,
      ).message,
      buttonText: this.i18nService.translate(
        MessageKeys.EMAIL_ADMIN_RESET_BUTTON_TEXT,
        languageCode,
      ).message,
      expiryNote: this.i18nService.translate(
        MessageKeys.EMAIL_ADMIN_RESET_EXPIRY_NOTE,
        languageCode,
      ).message,
      securityNote: this.i18nService.translate(
        MessageKeys.EMAIL_ADMIN_RESET_SECURITY_NOTE,
        languageCode,
      ).message,
      footer: this.i18nService.translate(
        MessageKeys.EMAIL_ADMIN_RESET_FOOTER,
        languageCode,
      ).message,
    };

    await this.emailService.sendAdminResetLinkEmail(
      user.email,
      subject,
      emailContent,
      resetUrl,
      languageCode,
    );
  }

  /**
   * Get language code from tenant language
   */
  private getLanguageCode(language: string): string {
    switch (language) {
      case Language.PERSIAN:
        return 'fa';
      case Language.ARABIC:
        return 'ar';
      default:
        return 'fa'; // Default to Persian for RTL support
    }
  }

  /**
   * ? - Change user account status (activate/deactivate)
   */
  async changeUserStatus(
    targetUserId: string,
    newStatus: UserStatus,
    reason: string | undefined,
    actorUserId: string,
    tenantId: string,
  ): Promise<{
    userId: string;
    previousStatus: UserStatus;
    newStatus: UserStatus;
    terminatedSessions: number;
    notificationSent: boolean;
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Fetch actor user with role information
      const actorUser = await this.userRepository.findOne({
        where: { id: actorUserId, tenantId },
        relations: ['userRoles', 'userRoles.role'],
      });

      if (!actorUser) {
        throw new BadRequestException({
          code: MessageKeys.USER_NOT_FOUND,
          message: this.i18nService.translate(MessageKeys.USER_NOT_FOUND)
            .message,
        });
      }

      // Fetch target user with role information
      const targetUser = await this.userRepository.findOne({
        where: { id: targetUserId, tenantId },
        relations: ['userRoles', 'userRoles.role'],
      });

      if (!targetUser) {
        throw new BadRequestException({
          code: MessageKeys.USER_NOT_FOUND,
          message: this.i18nService.translate(MessageKeys.USER_NOT_FOUND)
            .message,
        });
      }

      // BR01: Users cannot change their own account status
      if (actorUserId === targetUserId) {
        throw new ForbiddenException({
          code: MessageKeys.CANNOT_DEACTIVATE_SELF,
          message: this.i18nService.translate(
            MessageKeys.CANNOT_DEACTIVATE_SELF,
          ).message,
        });
      }

      // Get actor and target user roles (find active role)
      const actorRole = actorUser.userRoles?.find(ur => ur.isActive)?.role?.name;
      const targetRole = targetUser.userRoles?.find(ur => ur.isActive)?.role?.name;

      // BR01: Permission hierarchy validation
      if (!this.canChangeUserStatus(actorRole, targetRole)) {
        throw new ForbiddenException({
          code: MessageKeys.INSUFFICIENT_PERMISSIONS_STATUS_CHANGE,
          message: this.i18nService.translate(
            MessageKeys.INSUFFICIENT_PERMISSIONS_STATUS_CHANGE,
          ).message,
        });
      }

      // BR02: Prevent deactivating last active admin
      if (
        newStatus === UserStatus.INACTIVE &&
        (targetRole === RoleName.TENANT_OWNER || targetRole === RoleName.ADMIN)
      ) {
        await this.validateLastAdminRule(targetUserId, tenantId, targetRole);
      }

      // Check for invalid status transitions
      if (!this.isValidStatusTransition(targetUser.status, newStatus)) {
        throw new BadRequestException({
          code: MessageKeys.INVALID_STATUS_TRANSITION,
          message: this.i18nService.translate(
            MessageKeys.INVALID_STATUS_TRANSITION,
          ).message,
        });
      }

      const previousStatus = targetUser.status;

      // Skip if status is already the same
      if (previousStatus === newStatus) {
        await queryRunner.commitTransaction();
        return {
          userId: targetUserId,
          previousStatus,
          newStatus,
          terminatedSessions: 0,
          notificationSent: false,
        };
      }

      // Update user status
      await queryRunner.manager.update(
        User,
        { id: targetUserId },
        {
          status: newStatus,
          updatedAt: new Date(),
        },
      );

      // BR03: Terminate active sessions if deactivating
      let terminatedSessions = 0;
      if (newStatus === UserStatus.INACTIVE) {
        terminatedSessions = await this.terminateUserSessions(
          targetUserId,
          queryRunner,
        );
      }

      // Create audit log
      await this.createStatusChangeAuditLog(
        actorUserId,
        targetUserId,
        tenantId,
        previousStatus,
        newStatus,
        reason,
        queryRunner,
      );

      await queryRunner.commitTransaction();

      // BR05: Send notification email (outside transaction)
      let notificationSent = false;
      try {
        await this.sendStatusChangeNotification(
          targetUser,
          previousStatus,
          newStatus,
          reason,
        );
        notificationSent = true;
      } catch (error) {
        this.logger.warn(
          `Failed to send status change notification for user ${targetUserId}:`,
          error,
        );
      }

      return {
        userId: targetUserId,
        previousStatus,
        newStatus,
        terminatedSessions,
        notificationSent,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Status change failed for user ${targetUserId}:`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new InternalServerErrorException({
        code: MessageKeys.USER_STATUS_CHANGE_FAILED,
        message: this.i18nService.translate(
          MessageKeys.USER_STATUS_CHANGE_FAILED,
        ).message,
      });
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * ? - Bulk change user account status
   */
  async bulkChangeUserStatus(
    userIds: string[],
    newStatus: UserStatus,
    reason: string | undefined,
    actorUserId: string,
    tenantId: string,
  ): Promise<{
    totalRequested: number;
    successful: number;
    failed: number;
    results: Array<{
      userId: string;
      status: 'success' | 'failed';
      previousStatus?: UserStatus;
      newStatus?: UserStatus;
      terminatedSessions?: number;
      errorCode?: string;
      errorMessage?: string;
    }>;
  }> {
    const results: Array<{
      userId: string;
      status: 'success' | 'failed';
      previousStatus?: UserStatus;
      newStatus?: UserStatus;
      terminatedSessions?: number;
      errorCode?: string;
      errorMessage?: string;
    }> = [];

    let successful = 0;
    let failed = 0;

    // Process each user individually to ensure partial success
    for (const userId of userIds) {
      try {
        const result = await this.changeUserStatus(
          userId,
          newStatus,
          reason,
          actorUserId,
          tenantId,
        );

        results.push({
          userId,
          status: 'success',
          previousStatus: result.previousStatus,
          newStatus: result.newStatus,
          terminatedSessions: result.terminatedSessions,
        });

        successful++;
      } catch (error) {
        results.push({
          userId,
          status: 'failed',
          errorCode:
            error.response?.code || MessageKeys.USER_STATUS_CHANGE_FAILED,
          errorMessage: error.response?.message || error.message,
        });

        failed++;
        this.logger.warn(
          `Bulk status change failed for user ${userId}:`,
          error.message,
        );
      }
    }

    return {
      totalRequested: userIds.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Validate if actor can change target user status based on role hierarchy
   */
  private canChangeUserStatus(actorRole: string | undefined, targetRole: string | undefined): boolean {
    // If either role is undefined, deny access
    if (!actorRole || !targetRole) {
      return false;
    }

    // Tenant owners can change status of any user
    if (actorRole === RoleName.TENANT_OWNER) {
      return true;
    }

    // Admins can change status of employees and staff only
    if (actorRole === RoleName.ADMIN) {
      return (
        targetRole === RoleName.EMPLOYEE ||
        targetRole === RoleName.STAFF ||
        targetRole === RoleName.MANAGER
      );
    }

    // Managers can change status of employees and staff
    if (actorRole === RoleName.MANAGER) {
      return targetRole === RoleName.EMPLOYEE || targetRole === RoleName.STAFF;
    }

    return false;
  }

  /**
   * Validate that we're not deactivating the last active admin
   */
  private async validateLastAdminRule(
    targetUserId: string,
    tenantId: string,
    targetRole: string,
  ): Promise<void> {
    // Count other active admins/tenant owners
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.userRoles', 'userRole')
      .leftJoin('userRole.role', 'role')
      .where('user.tenantId = :tenantId', { tenantId })
      .andWhere('user.id != :targetUserId', { targetUserId })
      .andWhere('user.status = :activeStatus', {
        activeStatus: UserStatus.ACTIVE,
      })
      .andWhere('userRole.isActive = :isActive', { isActive: true });

    if (targetRole === RoleName.TENANT_OWNER) {
      query.andWhere('role.name = :roleName', {
        roleName: RoleName.TENANT_OWNER,
      });
    } else {
      query.andWhere('role.name IN (:...roleNames)', {
        roleNames: [RoleName.TENANT_OWNER, RoleName.ADMIN],
      });
    }

    const activeAdminCount = await query.getCount();

    if (activeAdminCount === 0) {
      throw new ForbiddenException({
        code: MessageKeys.CANNOT_DEACTIVATE_LAST_ADMIN,
        message: this.i18nService.translate(
          MessageKeys.CANNOT_DEACTIVATE_LAST_ADMIN,
        ).message,
      });
    }
  }

  /**
   * Validate status transition is allowed
   */
  private isValidStatusTransition(
    currentStatus: UserStatus,
    newStatus: UserStatus,
  ): boolean {
    // Allow any transition between active and inactive
    if (
      (currentStatus === UserStatus.ACTIVE &&
        newStatus === UserStatus.INACTIVE) ||
      (currentStatus === UserStatus.INACTIVE && newStatus === UserStatus.ACTIVE)
    ) {
      return true;
    }

    // Allow reactivating suspended users
    if (
      currentStatus === UserStatus.SUSPENDED &&
      newStatus === UserStatus.ACTIVE
    ) {
      return true;
    }

    // Don't allow direct changes to/from pending_verification via this API
    if (
      currentStatus === UserStatus.PENDING_VERIFICATION ||
      newStatus === UserStatus.PENDING_VERIFICATION
    ) {
      return false;
    }

    return false;
  }

  /**
   * Terminate all active sessions for a user
   */
  private async terminateUserSessions(
    userId: string,
    queryRunner: any,
  ): Promise<number> {
    const activeSessions = await queryRunner.manager.find(UserSession, {
      where: {
        userId,
        status: 'active',
      },
    });

    if (activeSessions.length > 0) {
      await queryRunner.manager.update(
        UserSession,
        { userId, status: 'active' },
        {
          status: 'invalidated',
          updatedAt: new Date(),
        },
      );
    }

    return activeSessions.length;
  }

  /**
   * Create audit log entry for status change
   */
  private async createStatusChangeAuditLog(
    actorUserId: string,
    targetUserId: string,
    tenantId: string,
    previousStatus: UserStatus,
    newStatus: UserStatus,
    reason: string | undefined,
    queryRunner: any,
  ): Promise<void> {
    const auditLog = queryRunner.manager.create(AuditLog, {
      tenantId,
      actorUserId,
      targetUserId,
      action: AuditAction.USER_STATUS_CHANGED,
      status: AuditStatus.SUCCESS,
      details: {
        previousStatus,
        newStatus,
        reason: reason || null,
        timestamp: new Date().toISOString(),
      },
      ipAddress: null, // Will be set by controller
      userAgent: null, // Will be set by controller
    });

    await queryRunner.manager.save(auditLog);
  }

  /**
   * Send status change notification email
   */
  private async sendStatusChangeNotification(
    user: User,
    previousStatus: UserStatus,
    newStatus: UserStatus,
    reason?: string,
  ): Promise<void> {
    // Get tenant for language settings
    const tenant = await this.tenantRepository.findOne({
      where: { id: user.tenantId },
    });

    if (!tenant) {
      throw new Error('Tenant not found for notification');
    }

    const languageCode = this.getLanguageCode(tenant.language);

    // Determine notification type
    const isDeactivation = newStatus === UserStatus.INACTIVE;

    // Get localized email content
    const subject = this.i18nService.translate(
      MessageKeys.EMAIL_STATUS_CHANGE_SUBJECT,
      languageCode,
    ).message;

    const header = this.i18nService.translate(
      isDeactivation
        ? MessageKeys.EMAIL_STATUS_DEACTIVATION_HEADER
        : MessageKeys.EMAIL_STATUS_REACTIVATION_HEADER,
      languageCode,
    ).message;

    const greeting = this.i18nService
      .translate(MessageKeys.EMAIL_STATUS_CHANGE_HELLO, languageCode)
      .message.replace('{{fullName}}', user.fullName);

    const mainMessage = this.i18nService.translate(
      isDeactivation
        ? MessageKeys.EMAIL_DEACTIVATION_NOTIFICATION
        : MessageKeys.EMAIL_REACTIVATION_NOTIFICATION,
      languageCode,
    ).message;

    const consequences = isDeactivation
      ? this.i18nService.translate(
          MessageKeys.EMAIL_DEACTIVATION_CONSEQUENCES,
          languageCode,
        ).message
      : this.i18nService.translate(
          MessageKeys.EMAIL_REACTIVATION_NEXT_STEPS,
          languageCode,
        ).message;

    const supportMessage = this.i18nService.translate(
      MessageKeys.EMAIL_STATUS_CHANGE_CONTACT_SUPPORT,
      languageCode,
    ).message;

    const footer = this.i18nService.translate(
      MessageKeys.EMAIL_STATUS_CHANGE_FOOTER,
      languageCode,
    ).message;

    // Build reason section if provided
    const reasonSection = reason
      ? this.i18nService
          .translate(MessageKeys.EMAIL_STATUS_CHANGE_REASON, languageCode)
          .message.replace('{{reason}}', reason)
      : '';

    // Prepare email content object for RTL-aware template
    const emailContent = {
      header,
      greeting,
      mainMessage,
      reasonSection,
      consequences,
      supportMessage,
      footer,
      isDeactivation, // Used for styling in template
    };

    // Send using RTL-aware status change email template
    await this.emailService.sendStatusChangeEmail(
      user.email,
      subject,
      emailContent,
      languageCode,
    );
  }

  /**
   * Get all available roles with assignment permissions
   * Used for user creation role dropdown
   *
   * @param actorUserId - ID of the user requesting the roles
   * @param tenantId - Tenant context for permission checking
   * @returns Array of roles with canAssign permissions
   */
  async getRoles(actorUserId: string, tenantId: string) {
    try {
      // Get all active roles
      const allRoles = await this.roleRepository.find({
        where: { isActive: true },
        order: { name: 'ASC' },
      });

      // Get actor's roles to determine what roles they can assign
      const actorRoles = await this.userRoleRepository.find({
        where: { userId: actorUserId, tenantId, isActive: true },
        relations: ['role'],
      });

      if (!actorRoles.length) {
        throw new ForbiddenException({
          code: MessageKeys.INSUFFICIENT_PERMISSIONS,
        });
      }

      const actorRoleNames = actorRoles.map((ur) => ur.role.name);
      const isTenantOwner = actorRoleNames.includes(RoleName.TENANT_OWNER);
      const isAdmin = actorRoleNames.includes(RoleName.ADMIN);

      // Map roles with assignment permissions based on business rules
      const rolesWithPermissions = allRoles.map((role) => {
        let canAssign = false;
        let displayName = '';

        // Set display names
        switch (role.name) {
          case RoleName.TENANT_OWNER:
            displayName = 'Tenant Owner';
            // Only tenant owners can assign tenant_owner role
            canAssign = isTenantOwner;
            break;
          case RoleName.ADMIN:
            displayName = 'Administrator';
            // Only tenant owners can assign admin role
            canAssign = isTenantOwner;
            break;
          case RoleName.MANAGER:
            displayName = 'Manager';
            // Tenant owners and admins can assign manager role
            canAssign = isTenantOwner || isAdmin;
            break;
          case RoleName.EMPLOYEE:
            displayName = 'Employee';
            // Tenant owners and admins can assign employee role
            canAssign = isTenantOwner || isAdmin;
            break;
          case RoleName.STAFF:
            displayName = 'Staff';
            // Tenant owners and admins can assign staff role
            canAssign = isTenantOwner || isAdmin;
            break;
          default:
            displayName = role.name;
            canAssign = false;
        }

        return {
          id: role.id,
          name: role.name,
          displayName,
          canAssign,
        };
      });

      return rolesWithPermissions;
    } catch (error) {
      this.logger.error(
        `Failed to get roles for user ${actorUserId} in tenant ${tenantId}`,
        error.stack,
      );

      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw new InternalServerErrorException({
        code: MessageKeys.INTERNAL_SERVER_ERROR,
      });
    }
  }
}
