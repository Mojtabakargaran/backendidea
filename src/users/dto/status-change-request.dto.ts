import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '../../common/enums';

export class StatusChangeRequestDto {
  @ApiProperty({
    description: 'New status for the user account',
    enum: UserStatus,
    example: 'inactive',
    enumName: 'UserStatus',
  })
  @IsEnum(UserStatus, { message: 'Status must be either active or inactive' })
  status: UserStatus;

  @ApiProperty({
    description: 'Reason for the status change (optional)',
    example: 'User requested account deactivation',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason?: string;
}
