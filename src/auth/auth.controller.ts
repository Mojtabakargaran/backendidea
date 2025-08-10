import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UsePipes,
  Headers,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiHeader,
  ApiQuery,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import './interfaces/request.interface';
import { AuthService } from './services/auth.service';
import { SessionAuthGuard } from './guards/session-auth.guard';
import {
  AuthenticatedUser,
  AuthenticatedTenant,
} from './decorators/authenticated-user.decorator';
import { User } from '@/entities/user.entity';
import { Tenant } from '@/entities/tenant.entity';
import { RegisterUserRequestDto } from './dto/register-user-request.dto';
import { RegisterUserResponseDto } from './dto/register-user-response.dto';
import { LoginRequestDto } from './dto/login-request.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetRequestResponseDto } from './dto/password-reset-request-response.dto';
import { PasswordResetCompleteRequestDto } from './dto/password-reset-complete-request.dto';
import { PasswordResetCompleteResponseDto } from './dto/password-reset-complete-response.dto';
import { EmailVerificationResponseDto } from './dto/email-verification-response.dto';
import { ResendVerificationRequestDto } from './dto/resend-verification-request.dto';
import { ResendVerificationResponseDto } from './dto/resend-verification-response.dto';
import { ErrorResponseDto } from './dto/error-response.dto';

/**
 * Authentication Controller
 * Handles user registration and authentication endpoints
 * Implements ? - User Registration with Tenant Creation
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register new user with automatic tenant creation
   * POST /api/auth/register
   * Implements ? - User Registration with Automatic Tenant Creation
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register new user with automatic tenant creation',
    description:
      'Creates a new user account and automatically establishes a new tenant organization with the user assigned as Tenant Owner. This endpoint implements ? - User Registration with Tenant Creation.',
    operationId: 'registerUser',
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'Language preference for response messages (required)',
    required: true,
    example: 'en',
    schema: {
      type: 'string',
      enum: ['en', 'fa', 'ar'],
    },
  })
  @ApiBody({
    type: RegisterUserRequestDto,
    description: 'User registration data',
    examples: {
      persian_iran: {
        summary: 'Persian user in Iran',
        value: {
          fullName: 'احمد محمدی',
          email: 'ahmad@example.com',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          companyName: 'شرکت اجاره خودرو پارس',
          language: 'persian',
          locale: 'iran',
        },
      },
      arabic_uae: {
        summary: 'Arabic user in UAE',
        value: {
          fullName: 'أحمد محمد',
          email: 'ahmad@example.ae',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          companyName: 'شركة تأجير السيارات الإمارات',
          language: 'arabic',
          locale: 'uae',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description:
      'User registered successfully, tenant created, confirmation email sent',
    type: RegisterUserResponseDto,
    example: {
      code: 'auth.REGISTRATION_SUCCESS',
      message:
        'Registration successful. Please check your email for verification.',
      data: {
        userId: '550e8400-e29b-41d4-a716-446655440001',
        tenantId: '550e8400-e29b-41d4-a716-446655440002',
        email: 'ahmad@example.com',
        redirectUrl: '/login',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation errors',
    type: ErrorResponseDto,
    example: {
      code: 'validation.REQUIRED_FIELDS_MISSING',
      message: 'Validation failed',
      errors: [
        {
          field: 'email',
          code: 'validation.INVALID_EMAIL_FORMAT',
          message: 'Invalid email format',
        },
      ],
    },
  })
  @ApiResponse({
    status: 422,
    description: 'Unprocessable entity - business rule violations',
    type: ErrorResponseDto,
    example: {
      code: 'auth.EMAIL_ALREADY_EXISTS',
      message: 'This email address is already registered',
      errors: [
        {
          field: 'email',
          code: 'auth.EMAIL_ALREADY_EXISTS',
          message: 'This email address is already registered',
        },
      ],
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error during registration process',
    type: ErrorResponseDto,
    example: {
      code: 'errors.DATABASE_ERROR',
      message: 'Database connection error',
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable - email service issues',
    type: ErrorResponseDto,
    example: {
      code: 'email.DELIVERY_DELAYED',
      message: 'Registration successful, confirmation email may be delayed',
    },
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async register(
    @Body() registerUserDto: RegisterUserRequestDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<RegisterUserResponseDto> {
    return await this.authService.registerUser(registerUserDto, acceptLanguage);
  }

  /**
   * User Login Authentication
   * POST /api/auth/login
   * Implements ? - User Login Authentication & ? - User Login with Role-Based Access
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login with role-based access',
    description:
      'Authenticate user and create session with tenant context and role-based permissions. Implements ? & ? - User Login with Role-Based Access.',
    operationId: 'loginUser',
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'Language preference for response messages (required)',
    required: true,
    example: 'en',
    schema: {
      type: 'string',
      enum: ['en', 'fa', 'ar'],
    },
  })
  @ApiBody({
    type: LoginRequestDto,
    description: 'User login credentials with optional remember me',
    examples: {
      english: {
        summary: 'English user login with remember me',
        value: {
          email: 'user@example.com',
          password: 'password123',
          rememberMe: false,
        },
      },
      persian: {
        summary: 'Persian user login',
        value: {
          email: 'ahmad@example.com',
          password: 'SecurePass123!',
          rememberMe: true,
        },
      },
      roleBasedLogin: {
        summary: 'Role-based login example',
        value: {
          email: 'admin@tenant.com',
          password: 'AdminPass123!',
          rememberMe: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful with role-based data',
    type: LoginResponseDto,
    example: {
      code: 'auth.LOGIN_SUCCESS',
      message: 'Login successful',
      data: {
        userId: '550e8400-e29b-41d4-a716-446655440001',
        tenantId: '550e8400-e29b-41d4-a716-446655440002',
        email: 'user@example.com',
        fullName: 'Ahmad Mohammad',
        roleName: 'admin',
        permissions: ['users.create', 'users.read', 'users.update'],
        redirectUrl: '/dashboard/admin',
        sessionExpiresAt: '2024-01-01T16:00:00.000Z',
        sessionToken: 'abcd1234567890...',
        rememberMeEnabled: false,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation errors',
    type: ErrorResponseDto,
    example: {
      code: 'validation.INVALID_EMAIL_FORMAT',
      message: 'Invalid email format',
      errors: [
        {
          field: 'email',
          code: 'validation.INVALID_EMAIL_FORMAT',
          message: 'Invalid email format',
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid credentials or account locked',
    type: ErrorResponseDto,
    example: {
      code: 'auth.INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    },
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - account deactivated, tenant suspended, or password reset required',
    type: ErrorResponseDto,
    example: {
      code: 'auth.ACCOUNT_DEACTIVATED',
      message:
        'Account has been deactivated. Please contact your administrator.',
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded',
    type: ErrorResponseDto,
    example: {
      code: 'auth.RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts. Please try again in 15 minutes',
      data: {
        retryAfter: 900,
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponseDto,
    example: {
      code: 'errors.DATABASE_CONNECTION_ERROR',
      message: 'Database connection error',
    },
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async login(
    @Body() loginDto: LoginRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<LoginResponseDto> {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.login(
      loginDto,
      ipAddress,
      userAgent,
      acceptLanguage,
    );

    // A4: Remember Me Functionality - set cookie with appropriate expiration
    const cookieMaxAge = result.data.rememberMeEnabled
      ? 30 * 24 * 60 * 60 * 1000 // 30 days
      : 8 * 60 * 60 * 1000; // 8 hours

    // Set session cookie for frontend use
    res.cookie('session', result.data.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: cookieMaxAge,
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? undefined : 'localhost',
    });

    return result;
  }

  /**
   * User Logout
   * POST /api/auth/logout
   * Implements ? - User Logout
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User logout',
    description:
      'Invalidate user session and clear browser data. Implements ? - User Logout.',
    operationId: 'logoutUser',
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'Language preference for response messages',
    required: false,
    example: 'en',
    schema: {
      type: 'string',
      enum: ['en', 'fa', 'ar'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    type: LogoutResponseDto,
    example: {
      code: 'auth.LOGOUT_SUCCESS',
      message: 'Logout successful',
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Session already expired',
    type: ErrorResponseDto,
    example: {
      code: 'auth.SESSION_EXPIRED',
      message: 'Session has expired',
    },
  })
  async logout(
    @Req() req: Request,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<LogoutResponseDto> {
    // Extract session token from Authorization header or cookies
    // This is a simplified implementation - in production, use proper authentication guards
    const authHeader = req.headers.authorization;
    const sessionToken = authHeader?.replace('Bearer ', '') || 'unknown';

    return await this.authService.logout(sessionToken, acceptLanguage);
  }

  /**
   * Password Reset Request
   * POST /api/auth/password-reset-request
   * Implements ? - Password Reset Request
   */
  @Post('password-reset-request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Send password reset link via email. Implements ? - Password Reset Request.',
    operationId: 'requestPasswordReset',
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'Language preference for response messages (required)',
    required: true,
    example: 'en',
    schema: {
      type: 'string',
      enum: ['en', 'fa', 'ar'],
    },
  })
  @ApiBody({
    type: PasswordResetRequestDto,
    description: 'User email for password reset',
    examples: {
      example: {
        summary: 'Password reset request',
        value: {
          email: 'user@example.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Reset link sent (always returns success for security)',
    type: PasswordResetRequestResponseDto,
    example: {
      code: 'auth.PASSWORD_RESET_LINK_SENT',
      message: 'Reset link sent to your email',
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid email format',
    type: ErrorResponseDto,
    example: {
      code: 'validation.INVALID_EMAIL_FORMAT',
      message: 'Invalid email format',
    },
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async requestPasswordReset(
    @Body() resetDto: PasswordResetRequestDto,
    @Req() req: Request,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<PasswordResetRequestResponseDto> {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    return await this.authService.requestPasswordReset(
      resetDto,
      ipAddress,
      userAgent,
      acceptLanguage,
    );
  }

  /**
   * Password Reset Completion
   * POST /api/auth/password-reset-complete
   * Implements ? - Password Reset Completion
   */
  @Post('password-reset-complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete password reset',
    description:
      'Reset password using valid token from email. Implements ? - Password Reset Completion.',
    operationId: 'completePasswordReset',
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'Language preference for response messages (required)',
    required: true,
    example: 'en',
    schema: {
      type: 'string',
      enum: ['en', 'fa', 'ar'],
    },
  })
  @ApiBody({
    type: PasswordResetCompleteRequestDto,
    description: 'Password reset completion data',
    examples: {
      example: {
        summary: 'Password reset completion',
        value: {
          token: 'abcd1234-5678-90ef-ghij-klmnopqrstuv',
          password: 'NewSecure123!',
          confirmPassword: 'NewSecure123!',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful',
    type: PasswordResetCompleteResponseDto,
    example: {
      code: 'auth.PASSWORD_RESET_SUCCESS',
      message: 'Password reset successful',
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid token, expired token, or password policy violation',
    type: ErrorResponseDto,
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async completePasswordReset(
    @Body() resetDto: PasswordResetCompleteRequestDto,
    @Req() req: Request,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<PasswordResetCompleteResponseDto> {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    return await this.authService.completePasswordReset(
      resetDto,
      ipAddress,
      userAgent,
      acceptLanguage,
    );
  }

  /**
   * Email Verification
   * GET /api/auth/verify-email
   * Implements ? - Email Verification After Registration
   */
  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email address',
    description:
      'Verify user email address using token from verification email. Implements ? - Email Verification Process from ?.',
    operationId: 'verifyEmail',
  })
  @ApiQuery({
    name: 'token',
    description: 'Email verification token from email link',
    required: true,
    type: 'string',
    example: 'abcd1234-5678-90ef-ghij-klmnopqrstuv',
  })
  @ApiQuery({
    name: 'lang',
    description:
      "User's preferred language for the frontend UI (forwarded from email link)",
    required: false,
    type: 'string',
    enum: ['fa', 'ar'],
    example: 'ar',
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'Language preference for response messages',
    required: true,
    schema: {
      type: 'string',
      enum: ['en', 'fa', 'ar'],
      example: 'en',
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Email verification successful',
    type: EmailVerificationResponseDto,
    example: {
      code: 'auth.EMAIL_VERIFIED_SUCCESS',
      message: 'Email verified successfully',
      data: {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        verifiedAt: '2024-01-15T10:30:00Z',
        redirectUrl: '/login',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid token, expired token, or already verified',
    type: ErrorResponseDto,
  })
  async verifyEmail(
    @Query('token') token: string,
    @Req() req: Request,
    @Headers('accept-language') acceptLanguage?: string,
    @Query('lang') lang?: string,
  ): Promise<EmailVerificationResponseDto> {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    return await this.authService.verifyEmail(
      token,
      ipAddress,
      userAgent,
      acceptLanguage,
      lang,
    );
  }

  /**
   * Resend Email Verification
   * POST /api/auth/resend-verification
   * Implements ? - Email Verification Process (Alternative Flow 3a: Token Expired)
   */
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend email verification',
    description:
      'Resend email verification link to user. Implements ? - Email Verification Process from ?.',
    operationId: 'resendEmailVerification',
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'Language preference for response messages',
    required: true,
    schema: {
      type: 'string',
      enum: ['en', 'fa', 'ar'],
      example: 'en',
    },
  })
  @ApiBody({
    type: ResendVerificationRequestDto,
    description: 'Email address for resending verification',
    examples: {
      resendVerification: {
        summary: 'Resend verification email',
        value: {
          email: 'user@example.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent successfully',
    type: ResendVerificationResponseDto,
    example: {
      code: 'auth.VERIFICATION_EMAIL_SENT',
      message: 'Verification email sent successfully',
      data: {
        email: 'user@example.com',
        expiresAt: '2024-01-16T10:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid email or already verified',
    type: ErrorResponseDto,
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async resendEmailVerification(
    @Body() resendDto: ResendVerificationRequestDto,
    @Req() req: Request,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<ResendVerificationResponseDto> {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    return await this.authService.resendEmailVerification(
      resendDto.email,
      ipAddress,
      userAgent,
      acceptLanguage,
    );
  }
}
