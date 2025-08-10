import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '../../common/enums';

export class BulkStatusChangeRequestDto {
  @ApiProperty({
    description: 'Array of user IDs to change status for',
    type: [String],
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '987fcdeb-51a2-43d1-9f42-123456789abc',
    ],
    minItems: 1,
    maxItems: 50,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one user ID must be provided' })
  @ArrayMaxSize(50, { message: 'Maximum 50 users can be processed at once' })
  @IsString({ each: true })
  userIds: string[];

  @ApiProperty({
    description: 'New status for all selected users',
    enum: UserStatus,
    example: 'inactive',
    enumName: 'UserStatus',
  })
  @IsEnum(UserStatus, { message: 'Status must be either active or inactive' })
  status: UserStatus;

  @ApiProperty({
    description: 'Common reason for all status changes (optional)',
    example: 'Temporary deactivation for system maintenance',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason?: string;
}
