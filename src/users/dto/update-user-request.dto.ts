import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Length,
  IsEnum,
  IsUUID,
  Matches,
} from 'class-validator';
import { UserStatus } from '@/common/enums';

/**
 * DTO for updating user profile information (?)
 * All fields are optional to support partial updates
 */
export class UpdateUserRequestDto {
  @ApiPropertyOptional({
    description: 'Full name of the user',
    example: 'Ahmad Rezaei',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(2, 100, { message: 'Full name must be between 2 and 100 characters' })
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Phone number in international format (nullable)',
    example: '+971501234567',
    pattern: '^\\+[1-9]\\d{1,14}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message:
      'Phone number must be in international format (e.g., +971501234567)',
  })
  phoneNumber?: string | null;

  @ApiPropertyOptional({
    description: 'Role ID to assign to the user',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID(4, { message: 'Role ID must be a valid UUID' })
  roleId?: string;

  @ApiPropertyOptional({
    description: 'Status for the user',
    enum: [UserStatus.ACTIVE, UserStatus.INACTIVE],
    example: UserStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum([UserStatus.ACTIVE, UserStatus.INACTIVE], {
    message: 'Status must be either active or inactive',
  })
  status?: UserStatus.ACTIVE | UserStatus.INACTIVE;
}
