import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsEmail,
  IsDateString,
  IsUrl,
  IsArray,
  IsBoolean,
} from 'class-validator';

/**
 * Login Response Data DTO
 * Enhanced for ? - User Login with Role-Based Access
 */
export class LoginResponseDataDto {
  @ApiProperty({
    description: 'User unique identifier',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Tenant unique identifier',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  tenantId: string;

  @ApiProperty({
    description: 'User email address',
    format: 'email',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'Ahmad Mohammad',
  })
  @IsString()
  fullName: string;

  @ApiProperty({
    description: 'User role name',
    example: 'admin',
    enum: ['tenant_owner', 'admin', 'manager', 'employee', 'staff'],
  })
  @IsString()
  roleName: string;

  @ApiProperty({
    description: 'User permissions for role-based access control',
    example: ['users.create', 'users.read', 'users.update'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @ApiProperty({
    description: 'Redirect URL after successful login (role-based dashboard)',
    example: '/dashboard/admin',
  })
  @IsUrl()
  redirectUrl: string;

  @ApiProperty({
    description: 'Session expiration timestamp',
    format: 'date-time',
    example: '2024-01-01T16:00:00.000Z',
  })
  @IsDateString()
  sessionExpiresAt: string;

  @ApiProperty({
    description: 'Session token for authentication',
    example: 'abcd1234567890...',
  })
  @IsString()
  sessionToken: string;

  @ApiProperty({
    description: 'Whether remember me was enabled for this session',
    example: false,
  })
  @IsBoolean()
  rememberMeEnabled: boolean;
}

/**
 * Login Response DTO
 * Success response for user login authentication
 * Implements ? - User Login Authentication & ? - User Login with Role-Based Access
 */
export class LoginResponseDto {
  @ApiProperty({
    description: 'Success message code',
    example: 'auth.LOGIN_SUCCESS',
    enum: ['auth.LOGIN_SUCCESS'],
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Localized success message',
    example: 'Login successful',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Login response data with role-based information',
    type: LoginResponseDataDto,
  })
  data: LoginResponseDataDto;
}
