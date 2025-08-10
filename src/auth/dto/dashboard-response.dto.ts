import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { DashboardDataDto } from './dashboard-data.dto';

/**
 * Dashboard Response DTO
 * Success response for dashboard data endpoint
 */
export class DashboardResponseDto {
  @ApiProperty({
    description: 'Response status code',
    example: 'dashboard.DASHBOARD_DATA_SUCCESS',
    enum: ['dashboard.DASHBOARD_DATA_SUCCESS'],
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Localized success message',
    example: 'Dashboard data loaded successfully',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Dashboard data',
    type: DashboardDataDto,
  })
  data: DashboardDataDto;
}
