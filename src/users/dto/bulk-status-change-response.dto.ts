import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '../../common/enums';

export class BulkStatusChangeResultDto {
  @ApiProperty({
    description: 'User ID that was processed',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Status of the operation for this user',
    enum: ['success', 'failed'],
    example: 'success',
  })
  status: 'success' | 'failed';

  @ApiProperty({
    description: 'Previous status of the user (if successful)',
    enum: UserStatus,
    example: 'active',
    required: false,
  })
  previousStatus?: UserStatus;

  @ApiProperty({
    description: 'New status of the user (if successful)',
    enum: UserStatus,
    example: 'inactive',
    required: false,
  })
  newStatus?: UserStatus;

  @ApiProperty({
    description: 'Number of sessions terminated (if successful)',
    example: 2,
    required: false,
  })
  terminatedSessions?: number;

  @ApiProperty({
    description: 'Error code if operation failed',
    example: 'users.INSUFFICIENT_PERMISSIONS_STATUS_CHANGE',
    required: false,
  })
  errorCode?: string;

  @ApiProperty({
    description: 'Error message if operation failed',
    example: 'You do not have permission to change the status of this user.',
    required: false,
  })
  errorMessage?: string;
}

export class BulkStatusChangeResponseDto {
  @ApiProperty({
    description: 'Total number of users requested for status change',
    example: 5,
  })
  totalRequested: number;

  @ApiProperty({
    description: 'Number of successful status changes',
    example: 3,
  })
  successful: number;

  @ApiProperty({
    description: 'Number of failed status changes',
    example: 2,
  })
  failed: number;

  @ApiProperty({
    description: 'Detailed results for each user',
    type: [BulkStatusChangeResultDto],
  })
  results: BulkStatusChangeResultDto[];
}
