import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsEnum,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@/common/enums';

export class CreateUserRequestDto {
  @ApiProperty({
    description: 'User full name',
    example: 'Ahmed Hassan',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @Length(2, 100, {
    message: 'Full name must be between 2 and 100 characters',
  })
  fullName: string;

  @ApiProperty({
    description: 'User email address',
    example: 'ahmed.hassan@company.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiPropertyOptional({
    description: 'User phone number in international format',
    example: '+971501234567',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Invalid phone number format. Use international format.',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'User password (required if generatePassword is false)',
    example: 'SecurePass123!',
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @Length(8, 100, {
    message: 'Password must be between 8 and 100 characters',
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password?: string;

  @ApiProperty({
    description: 'Role ID to assign to the user',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID(4, { message: 'Role ID must be a valid UUID' })
  roleId: string;

  @ApiPropertyOptional({
    description: 'User status',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'Invalid status' })
  status?: UserStatus;

  @ApiPropertyOptional({
    description: 'Whether to generate a secure password automatically',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  generatePassword?: boolean;
}
