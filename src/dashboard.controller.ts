import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { DashboardService } from './auth/services/dashboard.service';
import { SessionAuthGuard } from './auth/guards/session-auth.guard';
import {
  AuthenticatedUser,
  AuthenticatedTenant,
} from './auth/decorators/authenticated-user.decorator';
import { User } from '@/entities/user.entity';
import { Tenant } from '@/entities/tenant.entity';
import { DashboardResponseDto } from './auth/dto/dashboard-response.dto';
import { ErrorResponseDto } from './auth/dto/error-response.dto';

/**
 * Dashboard Controller
 * Handles dashboard data retrieval
 * Implements ? - Dashboard Access and Loading
 */
@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Get dashboard data for authenticated user
   * GET /api/dashboard
   * Implements ? - Dashboard Access and Loading
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionAuthGuard)
  @ApiOperation({
    summary: 'Get dashboard data',
    description:
      'Retrieve dashboard data for authenticated user including tenant info, user details, and system status',
  })
  @ApiHeader({
    name: 'accept-language',
    required: true,
    description: 'Preferred language for response messages',
    schema: {
      type: 'string',
      enum: ['en', 'fa', 'ar'],
      example: 'en',
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
    type: DashboardResponseDto,
    example: {
      code: 'dashboard.DASHBOARD_DATA_SUCCESS',
      message: 'Dashboard data loaded successfully',
      data: {
        tenant: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          companyName: 'Acme Corporation',
          registrationDate: '2025-01-15T10:30:00Z',
          userCount: 1,
          status: 'active',
        },
        user: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          fullName: 'Ahmad Mohammad',
          email: 'ahmad@example.com',
          role: 'tenant_owner',
          lastLogin: '2025-01-16T08:30:00Z',
        },
        systemInfo: {
          version: '1.0.0',
          lastUpdate: '2025-01-15T12:00:00Z',
          serviceStatus: 'operational',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Session expired or invalid',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Tenant inactive',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Database connection error',
    type: ErrorResponseDto,
  })
  async getDashboardData(
    @AuthenticatedUser() user: User,
    @AuthenticatedTenant() tenant: Tenant,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<DashboardResponseDto> {
    return await this.dashboardService.getDashboardData(
      user,
      tenant,
      acceptLanguage || 'en',
    );
  }
}
