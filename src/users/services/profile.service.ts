import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '@/entities/user.entity';
import { Role } from '@/entities/role.entity';
import { UserRole } from '@/entities/user-role.entity';
import { UserSession } from '@/entities/user-session.entity';
import { AuditLog } from '@/entities/audit-log.entity';
import { UpdateProfileRequestDto } from '../dto/update-profile-request.dto';
import { ChangePasswordRequestDto } from '../dto/change-password-request.dto';
import { UserActivityQueryDto } from '../dto/user-activity-response.dto';
import { MessageKeys } from '@/common/message-keys';
import { AuditAction, AuditStatus, UserSessionStatus } from '@/common/enums';
import { I18nService } from '@/i18n/i18n.service';

/**
 * Profile Service
 * Handles self-service profile management operations for ?
 */
@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(UserSession)
    private readonly userSessionRepository: Repository<UserSession>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly dataSource: DataSource,
    private readonly i18nService: I18nService,
  ) {}

  /**
   * Map activity type to i18n message key
   * @param activityType The activity type from AuditAction enum
   * @returns The corresponding message key for i18n translation
   */
  private getActivityTypeMessageKey(activityType: string): string {
    const activityTypeMap: Record<string, string> = {
      [AuditAction.ACTIVITY_VIEWED]: MessageKeys.ACTIVITY_TYPE_ACTIVITY_VIEWED,
      [AuditAction.PROFILE_VIEWED]: MessageKeys.ACTIVITY_TYPE_PROFILE_VIEWED,
      [AuditAction.INVENTORY_LIST_VIEWED]:
        MessageKeys.ACTIVITY_TYPE_INVENTORY_LIST_VIEWED,
      [AuditAction.LOGIN_SUCCESS]: MessageKeys.ACTIVITY_TYPE_LOGIN_SUCCESS,
      [AuditAction.LOGIN_FAILED]: MessageKeys.ACTIVITY_TYPE_LOGIN_FAILED,
      [AuditAction.LOGOUT]: MessageKeys.ACTIVITY_TYPE_LOGOUT,
      [AuditAction.PASSWORD_CHANGED]:
        MessageKeys.ACTIVITY_TYPE_PASSWORD_CHANGED,
      [AuditAction.PROFILE_UPDATED]: MessageKeys.ACTIVITY_TYPE_PROFILE_UPDATED,
      [AuditAction.USER_CREATED]: MessageKeys.ACTIVITY_TYPE_USER_CREATED,
      [AuditAction.USER_UPDATED]: MessageKeys.ACTIVITY_TYPE_USER_UPDATED,
      [AuditAction.USER_DELETED]: MessageKeys.ACTIVITY_TYPE_USER_DELETED,
      [AuditAction.USER_STATUS_CHANGED]:
        MessageKeys.ACTIVITY_TYPE_USER_STATUS_CHANGED,
      [AuditAction.USER_ROLE_CHANGED]:
        MessageKeys.ACTIVITY_TYPE_USER_ROLE_CHANGED,
      [AuditAction.CATEGORY_CREATED]:
        MessageKeys.ACTIVITY_TYPE_CATEGORY_CREATED,
      [AuditAction.CATEGORY_UPDATED]:
        MessageKeys.ACTIVITY_TYPE_CATEGORY_UPDATED,
      [AuditAction.CATEGORY_DELETED]:
        MessageKeys.ACTIVITY_TYPE_CATEGORY_DELETED,
      [AuditAction.INVENTORY_ITEM_CREATED]:
        MessageKeys.ACTIVITY_TYPE_INVENTORY_ITEM_CREATED,
      [AuditAction.INVENTORY_ITEM_UPDATED]:
        MessageKeys.ACTIVITY_TYPE_INVENTORY_ITEM_UPDATED,
      [AuditAction.INVENTORY_ITEM_DELETED]:
        MessageKeys.ACTIVITY_TYPE_INVENTORY_ITEM_DELETED,
      [AuditAction.INVENTORY_ITEM_VIEWED]:
        MessageKeys.ACTIVITY_TYPE_INVENTORY_ITEM_VIEWED,
      [AuditAction.AUDIT_LOGS_VIEWED]:
        MessageKeys.ACTIVITY_TYPE_AUDIT_LOGS_VIEWED,
      [AuditAction.PERMISSION_GRANTED]:
        MessageKeys.ACTIVITY_TYPE_PERMISSION_GRANTED,
      [AuditAction.PERMISSION_DENIED]:
        MessageKeys.ACTIVITY_TYPE_PERMISSION_DENIED,
    };

    return activityTypeMap[activityType] || activityType; // Fallback to original if not found
  }

  /**
   * Get current user's profile information
   * @param userId Current user ID
   * @param tenantId Current tenant ID
   * @param ipAddress Client IP address
   * @param userAgent Client user agent
   * @param language User language preference
   */
  async getUserProfile(
    userId: string,
    tenantId: string,
    ipAddress: string,
    userAgent: string,
    language: string,
  ) {
    try {
      // Find user with role information
      const user = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.userRoles', 'userRole')
        .leftJoinAndSelect('userRole.role', 'role')
        .where('user.id = :userId', { userId })
        .andWhere('user.tenantId = :tenantId', { tenantId })
        .andWhere('userRole.isActive = :isActive', { isActive: true })
        .getOne();

      if (!user) {
        this.logger.warn(`User not found for profile retrieval: ${userId}`);
        throw new NotFoundException({
          code: MessageKeys.USER_NOT_FOUND,
          message: this.i18nService.translate(
            MessageKeys.USER_NOT_FOUND,
            language,
          ),
        });
      }

      // Get role name
      const activeRole = user.userRoles?.[0]?.role;
      const roleName = activeRole ? activeRole.name : 'Unknown';

      // Log profile view activity
      await this.logActivity(
        AuditAction.PROFILE_VIEWED,
        AuditStatus.SUCCESS,
        userId,
        userId,
        tenantId,
        ipAddress,
        userAgent,
        'Profile information retrieved',
      );

      return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        status: user.status,
        roleName,
        lastLoginAt: user.lastLoginAt?.toISOString(),
        lastLoginIp: user.lastLoginIp,
        createdAt: user.createdAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error retrieving profile for user ${userId}: ${error.message}`,
        error.stack,
      );

      // Log failed attempt
      await this.logActivity(
        AuditAction.PROFILE_VIEWED,
        AuditStatus.FAILED,
        userId,
        userId,
        tenantId,
        ipAddress,
        userAgent,
        `Profile retrieval failed: ${error.message}`,
      );

      throw new InternalServerErrorException({
        code: MessageKeys.INTERNAL_SERVER_ERROR,
        message: this.i18nService.translate(
          MessageKeys.INTERNAL_SERVER_ERROR,
          language,
        ),
      });
    }
  }

  /**
   * Update current user's profile information
   * @param userId Current user ID
   * @param tenantId Current tenant ID
   * @param updateData Profile update data
   * @param ipAddress Client IP address
   * @param userAgent Client user agent
   * @param language User language preference
   */
  async updateUserProfile(
    userId: string,
    tenantId: string,
    updateData: UpdateProfileRequestDto,
    ipAddress: string,
    userAgent: string,
    language: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find user
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId, tenantId },
      });

      if (!user) {
        throw new NotFoundException({
          code: MessageKeys.USER_NOT_FOUND,
          message: this.i18nService.translate(
            MessageKeys.USER_NOT_FOUND,
            language,
          ),
        });
      }

      // Track changed fields
      const updatedFields: string[] = [];
      const oldValues: Record<string, any> = {};
      const newValues: Record<string, any> = {};

      // Update full name if provided
      if (updateData.fullName && updateData.fullName !== user.fullName) {
        oldValues.fullName = user.fullName;
        user.fullName = updateData.fullName;
        newValues.fullName = updateData.fullName;
        updatedFields.push('fullName');
      }

      // Update phone number if provided
      if (
        updateData.phoneNumber !== undefined &&
        updateData.phoneNumber !== user.phoneNumber
      ) {
        oldValues.phoneNumber = user.phoneNumber;
        user.phoneNumber = updateData.phoneNumber;
        newValues.phoneNumber = updateData.phoneNumber;
        updatedFields.push('phoneNumber');
      }

      // Check if any changes were made
      if (updatedFields.length === 0) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException({
          code: MessageKeys.NO_CHANGES_DETECTED,
          message: this.i18nService.translate(
            MessageKeys.NO_CHANGES_DETECTED,
            language,
          ),
        });
      }

      // Save updated user
      await queryRunner.manager.save(User, user);

      // Log successful update
      const auditDetails = {
        updatedFields,
        oldValues,
        newValues,
      };

      await this.logActivity(
        AuditAction.PROFILE_UPDATED,
        AuditStatus.SUCCESS,
        userId,
        userId,
        tenantId,
        ipAddress,
        userAgent,
        `Profile updated: ${updatedFields.join(', ')}`,
        auditDetails,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();

      return {
        userId: user.id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        updatedFields,
        updatedAt: user.updatedAt.toISOString(),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `Error updating profile for user ${userId}: ${error.message}`,
        error.stack,
      );

      throw new InternalServerErrorException({
        code: MessageKeys.PROFILE_UPDATE_FAILED,
        message: this.i18nService.translate(
          MessageKeys.PROFILE_UPDATE_FAILED,
          language,
        ),
      });
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Change current user's password
   * @param userId Current user ID
   * @param tenantId Current tenant ID
   * @param currentSessionId Current session ID to preserve
   * @param passwordData Password change data
   * @param ipAddress Client IP address
   * @param userAgent Client user agent
   * @param language User language preference
   */
  async changePassword(
    userId: string,
    tenantId: string,
    currentSessionId: string,
    passwordData: ChangePasswordRequestDto,
    ipAddress: string,
    userAgent: string,
    language: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find user
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId, tenantId },
      });

      if (!user) {
        throw new NotFoundException({
          code: MessageKeys.USER_NOT_FOUND,
          message: this.i18nService.translate(
            MessageKeys.USER_NOT_FOUND,
            language,
          ),
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        passwordData.currentPassword,
        user.passwordHash,
      );

      if (!isCurrentPasswordValid) {
        await this.logActivity(
          AuditAction.PASSWORD_CHANGED,
          AuditStatus.FAILED,
          userId,
          userId,
          tenantId,
          ipAddress,
          userAgent,
          'Password change failed: incorrect current password',
          null,
          queryRunner.manager,
        );

        await queryRunner.rollbackTransaction();
        throw new BadRequestException({
          code: MessageKeys.CURRENT_PASSWORD_INCORRECT,
          message: this.i18nService.translate(
            MessageKeys.CURRENT_PASSWORD_INCORRECT,
            language,
          ),
        });
      }

      // Validate new password confirmation
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new BadRequestException({
          code: MessageKeys.PASSWORD_CONFIRMATION_MISMATCH,
          message: this.i18nService.translate(
            MessageKeys.PASSWORD_CONFIRMATION_MISMATCH,
            language,
          ),
        });
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(
        passwordData.newPassword,
        saltRounds,
      );

      // Update user password
      user.passwordHash = newPasswordHash;
      user.passwordChangedAt = new Date();
      user.passwordResetRequired = false;

      await queryRunner.manager.save(User, user);

      // Invalidate all other sessions except current one
      const invalidatedSessions = await queryRunner.manager
        .createQueryBuilder()
        .update(UserSession)
        .set({
          status: UserSessionStatus.INVALIDATED,
          updatedAt: new Date(),
        })
        .where('userId = :userId', { userId })
        .andWhere('id != :currentSessionId', { currentSessionId })
        .andWhere('status = :activeStatus', {
          activeStatus: UserSessionStatus.ACTIVE,
        })
        .execute();

      // Log successful password change
      await this.logActivity(
        AuditAction.PASSWORD_CHANGED,
        AuditStatus.SUCCESS,
        userId,
        userId,
        tenantId,
        ipAddress,
        userAgent,
        `Password changed successfully, ${invalidatedSessions.affected || 0} other sessions invalidated`,
        null,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();

      return {
        userId: user.id,
        sessionsInvalidated: invalidatedSessions.affected || 0,
        passwordChangedAt: user.passwordChangedAt.toISOString(),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `Error changing password for user ${userId}: ${error.message}`,
        error.stack,
      );

      throw new InternalServerErrorException({
        code: MessageKeys.PASSWORD_CHANGE_FAILED,
        message: this.i18nService.translate(
          MessageKeys.PASSWORD_CHANGE_FAILED,
          language,
        ),
      });
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get current user's active sessions
   * @param userId Current user ID
   * @param tenantId Current tenant ID
   * @param currentSessionId Current session ID
   * @param ipAddress Client IP address
   * @param userAgent Client user agent
   * @param language User language preference
   */
  async getUserSessions(
    userId: string,
    tenantId: string,
    currentSessionId: string,
    ipAddress: string,
    userAgent: string,
    language: string,
  ) {
    try {
      // Get all active sessions for user
      const sessions = await this.userSessionRepository.find({
        where: {
          userId,
          tenantId,
          status: UserSessionStatus.ACTIVE,
        },
        order: {
          lastActivityAt: 'DESC',
        },
      });

      // Log session view activity
      await this.logActivity(
        AuditAction.ACTIVITY_VIEWED,
        AuditStatus.SUCCESS,
        userId,
        userId,
        tenantId,
        ipAddress,
        userAgent,
        'Active sessions retrieved',
      );

      const sessionList = sessions.map((session) => ({
        id: session.id,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        deviceFingerprint: session.deviceFingerprint,
        lastActivityAt: session.lastActivityAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        isCurrent: session.id === currentSessionId,
      }));

      return {
        currentSessionId,
        sessions: sessionList,
        totalSessions: sessions.length,
      };
    } catch (error) {
      this.logger.error(
        `Error retrieving sessions for user ${userId}: ${error.message}`,
        error.stack,
      );

      throw new InternalServerErrorException({
        code: MessageKeys.INTERNAL_SERVER_ERROR,
        message: this.i18nService.translate(
          MessageKeys.INTERNAL_SERVER_ERROR,
          language,
        ),
      });
    }
  }

  /**
   * Terminate a specific user session
   * @param userId Current user ID
   * @param tenantId Current tenant ID
   * @param sessionId Session ID to terminate
   * @param currentSessionId Current session ID (cannot terminate current session)
   * @param ipAddress Client IP address
   * @param userAgent Client user agent
   * @param language User language preference
   */
  async terminateSession(
    userId: string,
    tenantId: string,
    sessionId: string,
    currentSessionId: string,
    ipAddress: string,
    userAgent: string,
    language: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if trying to terminate current session
      if (sessionId === currentSessionId) {
        throw new BadRequestException({
          code: MessageKeys.CANNOT_TERMINATE_CURRENT_SESSION,
          message: this.i18nService.translate(
            MessageKeys.CANNOT_TERMINATE_CURRENT_SESSION,
            language,
          ),
        });
      }

      // Find the session
      const session = await queryRunner.manager.findOne(UserSession, {
        where: {
          id: sessionId,
          userId,
          tenantId,
          status: UserSessionStatus.ACTIVE,
        },
      });

      if (!session) {
        throw new NotFoundException({
          code: MessageKeys.SESSION_NOT_FOUND,
          message: this.i18nService.translate(
            MessageKeys.SESSION_NOT_FOUND,
            language,
          ),
        });
      }

      // Terminate the session
      session.status = UserSessionStatus.INVALIDATED;
      await queryRunner.manager.save(UserSession, session);

      // Log session termination
      await this.logActivity(
        AuditAction.SESSION_TERMINATED,
        AuditStatus.SUCCESS,
        userId,
        userId,
        tenantId,
        ipAddress,
        userAgent,
        `Session terminated: ${sessionId}`,
        { terminatedSessionId: sessionId },
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();

      return {
        sessionId,
        terminatedAt: new Date().toISOString(),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `Error terminating session ${sessionId} for user ${userId}: ${error.message}`,
        error.stack,
      );

      throw new InternalServerErrorException({
        code: MessageKeys.SESSION_TERMINATION_FAILED,
        message: this.i18nService.translate(
          MessageKeys.SESSION_TERMINATION_FAILED,
          language,
        ),
      });
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get current user's activity history
   * @param userId Current user ID
   * @param tenantId Current tenant ID
   * @param query Query parameters for pagination
   * @param ipAddress Client IP address
   * @param userAgent Client user agent
   * @param language User language preference
   */
  async getUserActivity(
    userId: string,
    tenantId: string,
    query: UserActivityQueryDto,
    ipAddress: string,
    userAgent: string,
    language: string,
  ) {
    try {
      const { page = 1, limit = 20 } = query;
      const skip = (page - 1) * limit;

      // Get total count for pagination
      const totalCount = await this.auditLogRepository.count({
        where: {
          actorUserId: userId,
          tenantId,
        },
      });

      // Get activity records
      const activities = await this.auditLogRepository.find({
        where: {
          actorUserId: userId,
          tenantId,
        },
        order: {
          createdAt: 'DESC',
        },
        skip,
        take: limit,
      });

      // Log activity view
      await this.logActivity(
        AuditAction.ACTIVITY_VIEWED,
        AuditStatus.SUCCESS,
        userId,
        userId,
        tenantId,
        ipAddress,
        userAgent,
        `Activity history retrieved (page ${page}, ${activities.length} records)`,
      );

      const activityRecords = activities.map((activity) => {
        // Get the message key for this activity type
        const messageKey = this.getActivityTypeMessageKey(activity.action);

        // Translate the activity type
        const translatedType = this.i18nService.translate(
          messageKey,
          language,
        ).message;

        return {
          type: translatedType,
          action: activity.action, // Include original action for frontend processing
          timestamp: activity.createdAt.toISOString(),
          ipAddress: activity.ipAddress,
          userAgent: activity.userAgent,
          details: activity.details,
        };
      });

      const totalPages = Math.ceil(totalCount / limit);

      return {
        activities: activityRecords,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalRecords: totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error retrieving activity for user ${userId}: ${error.message}`,
        error.stack,
      );

      throw new InternalServerErrorException({
        code: MessageKeys.ACTIVITY_RETRIEVAL_FAILED,
        message: this.i18nService.translate(
          MessageKeys.ACTIVITY_RETRIEVAL_FAILED,
          language,
        ),
      });
    }
  }

  /**
   * Log user activity for audit trail
   * @param action Audit action type
   * @param status Action status (success/failed)
   * @param actorUserId User performing the action
   * @param targetUserId User being acted upon
   * @param tenantId Tenant context
   * @param ipAddress Client IP address
   * @param userAgent Client user agent
   * @param details Additional details
   * @param additionalData Additional structured data
   * @param manager Optional entity manager for transaction
   */
  private async logActivity(
    action: AuditAction,
    status: AuditStatus,
    actorUserId: string,
    targetUserId: string,
    tenantId: string,
    ipAddress: string,
    userAgent: string,
    details: string,
    additionalData?: any,
    manager?: any,
  ): Promise<void> {
    try {
      const auditData = {
        tenantId,
        actorUserId,
        targetUserId,
        action,
        status,
        details: additionalData
          ? `${details} | Data: ${JSON.stringify(additionalData)}`
          : details,
        ipAddress,
        userAgent,
      };

      if (manager) {
        await manager.save(AuditLog, auditData);
      } else {
        await this.auditLogRepository.save(auditData);
      }
    } catch (error) {
      this.logger.error(
        `Failed to log audit activity: ${error.message}`,
        error.stack,
      );
      // Don't throw error for audit logging failures
    }
  }
}
