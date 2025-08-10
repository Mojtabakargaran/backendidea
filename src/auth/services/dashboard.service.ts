import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/entities/user.entity';
import { Tenant } from '@/entities/tenant.entity';
import { UserRole } from '@/entities/user-role.entity';
import { I18nService } from '@/i18n/i18n.service';
import { MessageKeys } from '@/common/message-keys';
import { DashboardResponseDto } from '../dto/dashboard-response.dto';
import { DashboardDataDto } from '../dto/dashboard-data.dto';

/**
 * Dashboard Service
 * Handles dashboard data retrieval and formatting
 * Implements ? - Dashboard Access and Loading
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly i18nService: I18nService,
  ) {}

  /**
   * Get dashboard data for authenticated user
   * @param user - Authenticated user
   * @param tenant - User's tenant
   * @param language - Request language
   * @returns Dashboard response with tenant, user, and system info
   */
  async getDashboardData(
    user: User,
    tenant: Tenant,
    language: string,
  ): Promise<DashboardResponseDto> {
    try {
      this.logger.log(
        `Getting dashboard data for user: ${user.id}, tenant: ${tenant.id}`,
      );

      // Get tenant user count
      const userCount = await this.userRepository.count({
        where: { tenantId: tenant.id },
      });

      // Get user role
      const userRole = await this.userRoleRepository.findOne({
        where: {
          userId: user.id,
          tenantId: tenant.id,
          isActive: true,
        },
        relations: ['role'],
      });

      // Build dashboard data
      const dashboardData: DashboardDataDto = {
        tenant: {
          id: tenant.id,
          companyName: tenant.companyName,
          registrationDate: tenant.createdAt.toISOString(),
          userCount,
          status: tenant.status,
        },
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: userRole?.role?.name || 'unknown',
          lastLogin:
            user.lastLoginAt?.toISOString() || new Date().toISOString(),
        },
        systemInfo: {
          version: '1.0.0',
          lastUpdate: new Date().toISOString(),
          serviceStatus: 'operational',
        },
      };

      // Get localized message
      const translationResponse = this.i18nService.translate(
        MessageKeys.DASHBOARD_DATA_SUCCESS,
        language,
      );

      const response: DashboardResponseDto = {
        code: MessageKeys.DASHBOARD_DATA_SUCCESS,
        message: translationResponse.message,
        data: dashboardData,
      };

      this.logger.log(
        `Dashboard data retrieved successfully for user: ${user.id}`,
      );
      return response;
    } catch (error) {
      this.logger.error('Error retrieving dashboard data:', error);

      const translationResponse = this.i18nService.translate(
        MessageKeys.DASHBOARD_DATA_ERROR,
        language,
      );

      throw new InternalServerErrorException({
        code: MessageKeys.DASHBOARD_DATA_ERROR,
        message: translationResponse.message,
      });
    }
  }
}
