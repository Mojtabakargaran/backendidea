import { ApiProperty } from '@nestjs/swagger';

/**
 * Field Error DTO - must be declared first
 */
export class FieldErrorDto {
  @ApiProperty({
    description: 'Name of the field that failed validation',
    example: 'email',
  })
  field: string;

  @ApiProperty({
    description: 'Message key for localization of the field error',
    example: 'auth.EMAIL_ALREADY_EXISTS',
    enum: [
      'auth.EMAIL_ALREADY_EXISTS',
      'auth.PASSWORD_CONFIRMATION_MISMATCH',
      'auth.PASSWORD_POLICY_VIOLATION',
      'validation.FIELD_REQUIRED',
      'validation.INVALID_EMAIL_FORMAT',
      'validation.COMPANY_NAME_LENGTH',
    ],
  })
  code: string;

  @ApiProperty({
    description: 'Human-readable field error message in English',
    example: 'This email address is already registered',
  })
  message: string;
}

/**
 * Data Transfer Object for Error Response
 * Follows API error format specified in README_API.md
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'Message key for localization of the error',
    example: 'auth.EMAIL_ALREADY_EXISTS',
    enum: [
      'auth.EMAIL_ALREADY_EXISTS',
      'auth.PASSWORD_CONFIRMATION_MISMATCH',
      'auth.PASSWORD_POLICY_VIOLATION',
      'validation.REQUIRED_FIELDS_MISSING',
      'validation.INVALID_INPUT',
      'validation.INVALID_EMAIL_FORMAT',
      'errors.TENANT_CREATION_FAILED',
      'errors.DATABASE_ERROR',
    ],
  })
  code: string;

  @ApiProperty({
    description: 'Human-readable error message in English',
    example: 'This email address is already registered',
  })
  message: string;

  @ApiProperty({
    description: 'Detailed field-level validation errors',
    type: [FieldErrorDto],
    required: false,
  })
  errors?: FieldErrorDto[];
}
