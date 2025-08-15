import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import '../interfaces/request.interface';
import { UserSession } from '@/entities/user-session.entity';
import { User } from '@/entities/user.entity';
import { Tenant } from '@/entities/tenant.entity';
import { UserSessionStatus, TenantStatus } from '@/common/enums';
import { MessageKeys } from '@/common/message-keys';

/**
 * Session Authentication Guard
 * Validates user session and loads user context
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  private readonly logger = new Logger(SessionAuthGuard.name);

  constructor(
    @InjectRepository(UserSession)
    private readonly userSessionRepository: Repository<UserSession>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Extract session token from cookie
    const sessionToken = request.cookies?.session;

    if (!sessionToken) {
      this.logger.warn('No session token found in request');
      throw new UnauthorizedException({
        code: MessageKeys.SESSION_EXPIRED,
        message: 'No session token found',
      });
    }

    try {
      // Find active session
      const session = await this.userSessionRepository.findOne({
        where: {
          sessionToken,
          status: UserSessionStatus.ACTIVE,
        },
        relations: ['user', 'tenant'],
      });

      if (!session) {
        this.logger.warn(`Invalid session token: ${sessionToken}`);
        throw new UnauthorizedException({
          code: MessageKeys.SESSION_EXPIRED,
          message: 'Invalid session token',
        });
      }

      // Check if session is expired
      if (session.expiresAt < new Date()) {
        this.logger.warn(`Expired session for user: ${session.user.id}`);

        // Update session status to expired
        await this.userSessionRepository.update(session.id, {
          status: UserSessionStatus.EXPIRED,
        });

        throw new UnauthorizedException({
          code: MessageKeys.SESSION_EXPIRED,
          message: 'Session has expired',
        });
      }

      // Load user with relationships including role
      const user = await this.userRepository.findOne({
        where: { id: session.user.id },
        relations: ['tenant', 'userRoles', 'userRoles.role'],
      });

      if (!user) {
        this.logger.error(`User not found for session: ${session.id}`);
        throw new UnauthorizedException({
          code: MessageKeys.USER_NOT_FOUND,
          message: 'User not found',
        });
      }

      // Check tenant status
      if (user.tenant.status !== TenantStatus.ACTIVE) {
        this.logger.warn(`Inactive tenant access attempt: ${user.tenant.id}`);
        throw new ForbiddenException({
          code: MessageKeys.DASHBOARD_TENANT_INACTIVE,
          message: 'Tenant is inactive',
        });
      }

      // Get user's active role
      const activeUserRole = user.userRoles?.find((ur) => ur.isActive);
      if (!activeUserRole?.role) {
        this.logger.error(`No active role found for user: ${user.id}`);
        throw new ForbiddenException({
          code: MessageKeys.INSUFFICIENT_ROLE_PRIVILEGES,
          message: 'No active role found',
        });
      }

      // Update last activity
      await this.userSessionRepository.update(session.id, {
        lastActivityAt: new Date(),
      });

      // Attach user with role, tenant, and session to request
      request.user = {
        ...user,
        roleName: activeUserRole.role.name as any,
      };
      request.tenant = user.tenant;
      request.sessionId = session.id;

      this.logger.log(
        `Authenticated user: ${user.id} for tenant: ${user.tenant.id}`,
      );
      return true;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.logger.error('Session validation error:', error);
      throw new UnauthorizedException({
        code: MessageKeys.SESSION_EXPIRED,
        message: 'Session validation failed',
      });
    }
  }
}
