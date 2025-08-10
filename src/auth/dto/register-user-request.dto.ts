import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Language, Locale } from '@/common/enums';
import { IsPasswordMatch } from '@/common/validators/password-match.validator';

/**
 * Data Transfer Object for User Registration Request
 * Implements validation rules from ? specifications
 */
export class RegisterUserRequestDto {
  @ApiProperty({
    description: "User's full name",
    example: 'Ahmad Mohammad',
    minLength: 2,
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @Length(2, 100)
  @Transform(({ value }) => value?.trim())
  fullName: string;

  @ApiProperty({
    description:
      "User's email address - must be unique across the entire platform",
    example: 'ahmad@example.com',
    format: 'email',
  })
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({
    description:
      "User's password - must meet security policy requirements (minimum 8 characters, uppercase, lowercase, number, special character)",
    example: 'SecurePass123!',
    minLength: 8,
  })
  @IsNotEmpty()
  @IsString()
  @Length(8, 128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;

  @ApiProperty({
    description: 'Password confirmation - must match the password field',
    example: 'SecurePass123!',
    minLength: 8,
  })
  @IsNotEmpty()
  @IsString()
  @IsPasswordMatch()
  confirmPassword: string;

  @ApiProperty({
    description: 'Company or business name for the tenant organization',
    example: 'Pars Car Rental Company',
    minLength: 2,
    maxLength: 200,
  })
  @IsNotEmpty()
  @IsString()
  @Length(2, 200)
  @Transform(({ value }) => value?.trim())
  companyName: string;

  @ApiProperty({
    description: 'UI language selection - permanent setting for the tenant',
    example: 'persian',
    enum: Language,
  })
  @IsNotEmpty()
  @IsEnum(Language)
  language: Language;

  @ApiProperty({
    description: 'Regional locale selection - permanent setting for the tenant',
    example: 'iran',
    enum: Locale,
  })
  @IsNotEmpty()
  @IsEnum(Locale)
  locale: Locale;
}
