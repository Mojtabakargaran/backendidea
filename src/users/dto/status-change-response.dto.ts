import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '../../common/enums';

export class StatusChangeResponseDto {
  @ApiProperty({
    description: 'User ID that was affected',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Previous status of the user',
    enum: UserStatus,
    example: 'active',
  })
  previousStatus: UserStatus;

  @ApiProperty({
    description: 'New status of the user',
    enum: UserStatus,
    example: 'inactive',
  })
  newStatus: UserStatus;

  @ApiProperty({
    description: 'Number of sessions terminated during status change',
    example: 3,
  })
  terminatedSessions: number;

  @ApiProperty({
    description: 'Whether notification email was sent successfully',
    example: true,
  })
  notificationSent: boolean;
}
