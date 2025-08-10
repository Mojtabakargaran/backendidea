import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * User Activity Query DTO
 * Query parameters for fetching user activity (?)
 */
export class UserActivityQueryDto {
  @ApiProperty({
    description: 'Number of activity records per page',
    example: 20,
    required: false,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number = 20;

  @ApiProperty({
    description: 'Page number (1-based)',
    example: 1,
    required: false,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;
}

/**
 * Activity Record DTO
 * Represents a single activity record
 */
export class ActivityRecordDto {
  @ApiProperty({
    description: 'Type of activity performed (translated)',
    example: 'Profile Updated',
  })
  type: string;

  @ApiProperty({
    description: 'Original action type for frontend processing',
    example: 'profile_updated',
  })
  action: string;

  @ApiProperty({
    description: 'Activity timestamp',
    example: '2025-01-15T10:30:00Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'IP address where activity occurred',
    example: '192.168.1.100',
    required: false,
  })
  ipAddress?: string;

  @ApiProperty({
    description: 'User agent string for the activity',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    required: false,
  })
  userAgent?: string;

  @ApiProperty({
    description: 'Additional activity details',
    example: 'Updated phone number',
    required: false,
  })
  details?: string;
}

/**
 * Pagination Info DTO
 * Pagination metadata for activity list
 */
export class PaginationInfoDto {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  currentPage: number;

  @ApiProperty({
    description: 'Number of records per page',
    example: 20,
  })
  pageSize: number;

  @ApiProperty({
    description: 'Total number of records',
    example: 45,
  })
  totalRecords: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPrevious: boolean;
}

/**
 * User Activity Response DTO
 * Contains user activity records with pagination
 */
export class UserActivityResponseDto {
  @ApiProperty({
    description: 'List of activity records',
    type: [ActivityRecordDto],
  })
  activities: ActivityRecordDto[];

  @ApiProperty({
    description: 'Pagination information',
    type: PaginationInfoDto,
  })
  pagination: PaginationInfoDto;
}

/**
 * User Activity API Response DTO
 * Standard API response wrapper for user activity
 */
export class UserActivityApiResponseDto {
  @ApiProperty({
    description: 'Response code for localization',
    example: 'users.ACTIVITY_RETRIEVED',
  })
  code: string;

  @ApiProperty({
    description: 'Localized response message',
    example: 'Account activity retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Activity data with pagination',
    type: UserActivityResponseDto,
  })
  data: UserActivityResponseDto;
}
