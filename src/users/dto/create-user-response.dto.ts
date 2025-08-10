import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageKey } from '@/common/message-keys';

export class CreateUserResponseDto {
  @ApiProperty({
    description: 'Response code for internationalization',
    example: 'users.USER_CREATED_SUCCESS',
  })
  code: MessageKey;

  @ApiProperty({
    description: 'Localized response message',
    example: 'User created successfully',
  })
  message: string;

  @ApiProperty({
    description: 'User creation data',
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        format: 'uuid',
        description: 'Created user ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
      },
      fullName: {
        type: 'string',
        description: 'User full name',
        example: 'Ahmed Hassan',
      },
      email: {
        type: 'string',
        format: 'email',
        description: 'User email address',
        example: 'ahmed.hassan@company.com',
      },
      status: {
        type: 'string',
        description: 'User status',
        example: 'active',
      },
      roleId: {
        type: 'string',
        format: 'uuid',
        description: 'Assigned role ID',
        example: '550e8400-e29b-41d4-a716-446655440001',
      },
      roleName: {
        type: 'string',
        description: 'Assigned role name',
        example: 'employee',
      },
      welcomeEmailSent: {
        type: 'boolean',
        description: 'Whether welcome email was sent successfully',
        example: true,
      },
      generatedPassword: {
        type: 'string',
        description: 'Generated password (only if generatePassword=true)',
        example: 'TempPass123!',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'User creation timestamp',
        example: '2025-01-20T10:30:00Z',
      },
    },
  })
  data: {
    userId: string;
    fullName: string;
    email: string;
    status: string;
    roleId: string;
    roleName: string;
    welcomeEmailSent: boolean;
    generatedPassword?: string;
    createdAt: string;
  };
}
