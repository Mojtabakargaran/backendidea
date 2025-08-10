import {
  Controller,
  Post,
  Put,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Headers,
  Ip,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { UsersService } from './services/users.service';
import { ProfileService } from './services/profile.service';
import { CreateUserRequestDto } from './dto/create-user-request.dto';
import { CreateUserResponseDto } from './dto/create-user-response.dto';
import { UpdateUserRequestDto } from './dto/update-user-request.dto';
import { UpdateUserResponseDto } from './dto/update-user-response.dto';
import { ResetPasswordDto } from './dto/reset-password-request.dto';
import { ResetPasswordResponseDto } from './dto/reset-password-response.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { ListUsersResponseDto } from './dto/list-users-response.dto';
import { UserProfileApiResponseDto } from './dto/user-profile-response.dto';
import {
  UpdateProfileRequestDto,
  UpdateProfileApiResponseDto,
} from './dto/update-profile-request.dto';
import {
  ChangePasswordRequestDto,
  ChangePasswordApiResponseDto,
} from './dto/change-password-request.dto';
import {
  UserSessionsApiResponseDto,
  TerminateSessionApiResponseDto,
} from './dto/user-sessions-response.dto';
import {
  UserActivityQueryDto,
  UserActivityApiResponseDto,
} from './dto/user-activity-response.dto';
import { StatusChangeRequestDto } from './dto/status-change-request.dto';
import { BulkStatusChangeRequestDto } from './dto/bulk-status-change-request.dto';
import { RolesApiResponseDto } from './dto/roles-response.dto';
import { SessionAuthGuard } from '@/auth/guards/session-auth.guard';
import { AuthenticatedUser } from '@/auth/decorators/authenticated-user.decorator';
import { MessageKeys } from '@/common/message-keys';
import { I18nService } from '@/i18n/i18n.service';

@ApiTags('User Management')
@Controller('users')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth('session')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly profileService: ProfileService,
    private readonly i18nService: I18nService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create New User Account (?)',
    description:
      'Creates a new user account within the tenant environment with role assignment and welcome email',
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'Language preference (en, fa, ar)',
    required: true,
    example: 'fa',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: CreateUserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Session expired',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Email already exists',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async createUser(
    @Body() createUserDto: CreateUserRequestDto,
    @AuthenticatedUser() user: any,
    @Headers('accept-language') acceptLanguage: string,
    @Ip() ipAddress: string,
    @Req() req: Request,
  ): Promise<CreateUserResponseDto> {
    const userAgent = req.get('User-Agent') || '';

    const userData = await this.usersService.createUser(
      createUserDto,
      user.id,
      user.tenantId,
      ipAddress,
      userAgent,
      acceptLanguage,
    );

    const message = this.i18nService.translate(
      MessageKeys.USER_CREATED_SUCCESS,
      acceptLanguage,
    ).message;

    return {
      code: MessageKeys.USER_CREATED_SUCCESS,
      message,
      data: userData,
    };
  }

  @Get('roles')
  @ApiOperation({
    summary: 'Get available roles for user assignment',
    description:
      'Get all available roles that can be assigned to users, with permissions indicating which roles the current user can assign',
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'Language preference (en, fa, ar)',
    required: true,
    example: 'fa',
  })
  @ApiResponse({
    status: 200,
    description: 'Roles retrieved successfully',
    type: RolesApiResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Session expired',
    schema: {
      example: {
        code: 'auth.SESSION_EXPIRED',
        message: 'Session has expired. Please login again',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
    schema: {
      example: {
        code: 'users.INSUFFICIENT_PERMISSIONS',
        message: 'You do not have permission to view roles',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: {
        code: 'errors.INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    },
  })
  @UseGuards(SessionAuthGuard)
  async getRoles(
    @Headers('accept-language') acceptLanguage: string,
    @Req() req: Request,
    @AuthenticatedUser() user: any,
  ): Promise<RolesApiResponseDto> {
    const roles = await this.usersService.getRoles(user.id, user.tenantId);

    const message = await this.i18nService.translate(
      MessageKeys.ROLES_RETRIEVED_SUCCESS,
      acceptLanguage,
    ).message;

    return {
      code: MessageKeys.ROLES_RETRIEVED_SUCCESS,
      message,
      data: roles,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'List and view users',
    description:
      'Get a paginated list of users within the tenant with filtering, sorting, and search capabilities',
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'Language preference (en, fa, ar)',
    required: true,
    example: 'fa',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (1-based)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Users per page (1-100)',
    example: 25,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term for fullName or email',
    example: 'محمد',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
    enum: ['active', 'inactive', 'pending_verification', 'suspended'],
  })
  @ApiQuery({
    name: 'roleId',
    required: false,
    description: 'Filter by role ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort field',
    enum: ['fullName', 'email', 'lastLoginAt', 'createdAt', 'status'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort direction',
    enum: ['asc', 'desc'],
  })
  @ApiQuery({
    name: 'lastLoginFrom',
    required: false,
    description: 'Filter by last login from date (ISO 8601)',
    example: '2025-01-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'lastLoginTo',
    required: false,
    description: 'Filter by last login to date (ISO 8601)',
    example: '2025-01-31T23:59:59.999Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Users list retrieved successfully',
    type: ListUsersResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid filter criteria, sort field, or page parameters',
    schema: {
      example: {
        code: 'users.INVALID_FILTER_CRITERIA',
        message: 'Invalid filter criteria provided',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Session expired',
    schema: {
      example: {
        code: 'auth.SESSION_EXPIRED',
        message: 'Session has expired. Please login again',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
    schema: {
      example: {
        code: 'users.INSUFFICIENT_PERMISSIONS',
        message: 'You do not have permission to view users',
      },
    },
  })
  async listUsers(
    @Query() queryParams: ListUsersQueryDto,
    @Headers('accept-language') acceptLanguage: string = 'fa',
    @AuthenticatedUser() user: any,
  ): Promise<ListUsersResponseDto> {
    const userData = await this.usersService.listUsers(
      queryParams,
      user.id,
      user.tenantId,
      acceptLanguage,
    );

    const message = this.i18nService.translate(
      MessageKeys.USERS_LIST_SUCCESS,
      acceptLanguage,
    ).message;

    return {
      code: MessageKeys.USERS_LIST_SUCCESS,
      message,
      data: userData,
    };
  }

  // ? - Self-Service Profile Management Endpoints

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      "Retrieve current user's profile information including personal details and account status",
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'User language preference',
    enum: ['fa', 'ar', 'en'],
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    type: UserProfileApiResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Session expired',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - User not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async getUserProfile(
    @Headers('accept-language') acceptLanguage: string = 'fa',
    @Ip() ipAddress: string,
    @Req() req: Request,
    @AuthenticatedUser() user: any,
  ): Promise<UserProfileApiResponseDto> {
    const userAgent = req.headers['user-agent'] || 'unknown';

    const profileData = await this.profileService.getUserProfile(
      user.id,
      user.tenantId,
      ipAddress,
      userAgent,
      acceptLanguage,
    );

    const message = this.i18nService.translate(
      MessageKeys.PROFILE_RETRIEVED_SUCCESS,
      acceptLanguage,
    ).message;

    return {
      code: MessageKeys.PROFILE_RETRIEVED_SUCCESS,
      message,
      data: profileData,
    };
  }

  @Put('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update current user profile',
    description:
      "Update current user's profile information (full name and phone number)",
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'User language preference',
    enum: ['fa', 'ar', 'en'],
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: UpdateProfileApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data or no changes detected',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Session expired',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - User not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async updateUserProfile(
    @Body() updateProfileDto: UpdateProfileRequestDto,
    @Headers('accept-language') acceptLanguage: string = 'fa',
    @Ip() ipAddress: string,
    @Req() req: Request,
    @AuthenticatedUser() user: any,
  ): Promise<UpdateProfileApiResponseDto> {
    const userAgent = req.headers['user-agent'] || 'unknown';

    const updateData = await this.profileService.updateUserProfile(
      user.id,
      user.tenantId,
      updateProfileDto,
      ipAddress,
      userAgent,
      acceptLanguage,
    );

    const message = this.i18nService.translate(
      MessageKeys.PROFILE_UPDATED_SUCCESS,
      acceptLanguage,
    ).message;

    return {
      code: MessageKeys.PROFILE_UPDATED_SUCCESS,
      message,
      data: updateData,
    };
  }

  @Post('profile/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change current user password',
    description:
      "Change current user's password with current password verification",
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'User language preference',
    enum: ['fa', 'ar', 'en'],
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    type: ChangePasswordApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Invalid password or password confirmation mismatch',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Session expired',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - User not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async changePassword(
    @Body() changePasswordDto: ChangePasswordRequestDto,
    @Headers('accept-language') acceptLanguage: string = 'fa',
    @Ip() ipAddress: string,
    @Req() req: Request,
    @AuthenticatedUser() user: any,
  ): Promise<ChangePasswordApiResponseDto> {
    const userAgent = req.headers['user-agent'] || 'unknown';
    const currentSessionId = req.sessionId || user.sessionId;

    const passwordData = await this.profileService.changePassword(
      user.id,
      user.tenantId,
      currentSessionId,
      changePasswordDto,
      ipAddress,
      userAgent,
      acceptLanguage,
    );

    const message = this.i18nService.translate(
      MessageKeys.PASSWORD_CHANGED_SUCCESS,
      acceptLanguage,
    ).message;

    return {
      code: MessageKeys.PASSWORD_CHANGED_SUCCESS,
      message,
      data: passwordData,
    };
  }

  @Get('profile/sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get active user sessions',
    description: "Retrieve list of current user's active sessions",
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'User language preference',
    enum: ['fa', 'ar', 'en'],
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Sessions retrieved successfully',
    type: UserSessionsApiResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Session expired',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async getUserSessions(
    @Headers('accept-language') acceptLanguage: string = 'fa',
    @Ip() ipAddress: string,
    @Req() req: Request,
    @AuthenticatedUser() user: any,
  ): Promise<UserSessionsApiResponseDto> {
    const userAgent = req.headers['user-agent'] || 'unknown';
    const currentSessionId = req.sessionId || user.sessionId;

    const sessionsData = await this.profileService.getUserSessions(
      user.id,
      user.tenantId,
      currentSessionId,
      ipAddress,
      userAgent,
      acceptLanguage,
    );

    const message = this.i18nService.translate(
      MessageKeys.SESSIONS_RETRIEVED_SUCCESS,
      acceptLanguage,
    ).message;

    return {
      code: MessageKeys.SESSIONS_RETRIEVED_SUCCESS,
      message,
      data: sessionsData,
    };
  }

  @Delete('profile/sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Terminate a specific session',
    description:
      'Terminate a specific user session (cannot terminate current session)',
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'User language preference',
    enum: ['fa', 'ar', 'en'],
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Session terminated successfully',
    type: TerminateSessionApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Cannot terminate current session',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Session expired',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Session not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async terminateSession(
    @Param('sessionId') sessionId: string,
    @Headers('accept-language') acceptLanguage: string = 'fa',
    @Ip() ipAddress: string,
    @Req() req: Request,
    @AuthenticatedUser() user: any,
  ): Promise<TerminateSessionApiResponseDto> {
    const userAgent = req.headers['user-agent'] || 'unknown';
    const currentSessionId = req.sessionId || user.sessionId;

    const terminationData = await this.profileService.terminateSession(
      user.id,
      user.tenantId,
      sessionId,
      currentSessionId,
      ipAddress,
      userAgent,
      acceptLanguage,
    );

    const message = this.i18nService.translate(
      MessageKeys.SESSION_TERMINATED_SUCCESS,
      acceptLanguage,
    ).message;

    return {
      code: MessageKeys.SESSION_TERMINATED_SUCCESS,
      message,
      data: terminationData,
    };
  }

  @Get('profile/activity')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get user activity history',
    description:
      "Retrieve current user's account activity history with pagination",
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'User language preference',
    enum: ['fa', 'ar', 'en'],
    required: true,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of activity records per page (1-100)',
    type: Number,
    required: false,
    example: 20,
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number (1-based)',
    type: Number,
    required: false,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Activity retrieved successfully',
    type: UserActivityApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid query parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Session expired',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async getUserActivity(
    @Query() query: UserActivityQueryDto,
    @Headers('accept-language') acceptLanguage: string = 'fa',
    @Ip() ipAddress: string,
    @Req() req: Request,
    @AuthenticatedUser() user: any,
  ): Promise<UserActivityApiResponseDto> {
    const userAgent = req.headers['user-agent'] || 'unknown';

    const activityData = await this.profileService.getUserActivity(
      user.id,
      user.tenantId,
      query,
      ipAddress,
      userAgent,
      acceptLanguage,
    );

    const message = this.i18nService.translate(
      MessageKeys.ACTIVITY_RETRIEVED_SUCCESS,
      acceptLanguage,
    ).message;

    return {
      code: MessageKeys.ACTIVITY_RETRIEVED_SUCCESS,
      message,
      data: activityData,
    };
  }

  @Put(':userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update User Profile (?)',
    description:
      'Updates user profile information including personal details, role assignments, and account status within permission scope',
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'Preferred language for localized responses',
    enum: ['en', 'fa', 'ar'],
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'users.USER_UPDATED_SUCCESS' },
        message: {
          type: 'string',
          example: 'User profile updated successfully',
        },
        data: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
            fullName: { type: 'string' },
            email: { type: 'string' },
            phoneNumber: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['active', 'inactive'] },
            roleId: { type: 'string', format: 'uuid' },
            roleName: { type: 'string' },
            updatedAt: { type: 'string', format: 'date-time' },
            modifiedFields: { type: 'array', items: { type: 'string' } },
            notificationSent: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation errors or insufficient permissions for role assignment',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          enum: [
            'validation.FIELD_REQUIRED',
            'users.INVALID_USER_STATUS',
            'users.INVALID_ROLE_ASSIGNMENT',
            'users.NO_CHANGES_DETECTED',
          ],
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'auth.SESSION_EXPIRED' },
        message: {
          type: 'string',
          example: 'Session has expired. Please login again',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      'Insufficient permissions or cannot edit higher-privilege user',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          enum: [
            'users.INSUFFICIENT_PERMISSIONS',
            'users.CANNOT_EDIT_HIGHER_PRIVILEGE_USER',
            'users.CANNOT_MODIFY_OWN_ROLE',
            'users.CANNOT_MODIFY_OWN_STATUS',
          ],
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'errors.USER_NOT_FOUND' },
        message: { type: 'string', example: 'User not found' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'errors.INTERNAL_SERVER_ERROR' },
        message: { type: 'string', example: 'An unexpected error occurred' },
      },
    },
  })
  async updateUser(
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdateUserRequestDto,
    @Headers('accept-language') acceptLanguage: string = 'fa',
    @Ip() ipAddress: string,
    @Req() req: Request,
    @AuthenticatedUser() user: any,
  ): Promise<UpdateUserResponseDto> {
    const userAgent = req.headers['user-agent'] || 'unknown';

    const userData = await this.usersService.updateUser(
      userId,
      updateUserDto,
      user.id,
      user.tenantId,
      ipAddress,
      userAgent,
      acceptLanguage,
    );

    const message = this.i18nService.translate(
      MessageKeys.USER_UPDATED_SUCCESS,
      acceptLanguage,
    ).message;

    return {
      code: MessageKeys.USER_UPDATED_SUCCESS,
      message,
      data: userData,
    };
  }

  @Post(':userId/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset User Password (?)',
    description:
      'Initiates password reset for a user account by an administrator',
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'Language preference (en, fa, ar)',
    required: true,
    example: 'fa',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset initiated successfully',
    type: ResetPasswordResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid reset method or input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Session expired',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - User not found',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - Rate limit exceeded',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async resetUserPassword(
    @Param('userId') userId: string,
    @Body() resetPasswordDto: ResetPasswordDto,
    @Headers('accept-language') acceptLanguage: string = 'fa',
    @Ip() ipAddress: string,
    @Req() req: Request,
    @AuthenticatedUser() user: any,
  ): Promise<ResetPasswordResponseDto> {
    const userAgent = req.headers['user-agent'] || 'unknown';

    const resetData = await this.usersService.resetUserPassword(
      userId,
      resetPasswordDto.resetMethod,
      user.id,
      user.tenantId,
      ipAddress,
      userAgent,
      acceptLanguage,
    );

    const message = this.i18nService.translate(
      MessageKeys.ADMIN_PASSWORD_RESET_SUCCESS,
      acceptLanguage,
    ).message;

    return {
      code: MessageKeys.ADMIN_PASSWORD_RESET_SUCCESS,
      message,
      data: resetData,
    };
  }

  /**
   * ? - Change individual user account status (activate/deactivate)
   */
  @ApiOperation({
    summary: 'Change user account status',
    description:
      'Allows authorized administrators to change user account status between active and inactive states',
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'Language preference',
    required: true,
    example: 'en',
  })
  @ApiResponse({
    status: 200,
    description: 'User status changed successfully',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'success.USER_STATUS_CHANGED',
          enum: [MessageKeys.USER_STATUS_CHANGED_SUCCESS],
        },
        message: {
          type: 'string',
          example: 'User status changed successfully',
        },
        data: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            previousStatus: {
              type: 'string',
              enum: ['active', 'inactive', 'pending_verification', 'suspended'],
              example: 'active',
            },
            newStatus: {
              type: 'string',
              enum: ['active', 'inactive', 'pending_verification', 'suspended'],
              example: 'inactive',
            },
            terminatedSessions: { type: 'number', example: 3 },
            notificationSent: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or invalid status transition',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'users.INVALID_STATUS_TRANSITION' },
        message: {
          type: 'string',
          example:
            'Invalid status transition. The requested status change is not allowed.',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired session',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'auth.SESSION_EXPIRED' },
        message: {
          type: 'string',
          example: 'Session has expired. Please login again',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Insufficient permissions or business rule violation',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'users.CANNOT_DEACTIVATE_SELF' },
        message: {
          type: 'string',
          example:
            'You cannot deactivate your own account. Please contact another administrator.',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'errors.USER_NOT_FOUND' },
        message: { type: 'string', example: 'User not found' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - User has active operations',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'users.USER_HAS_ACTIVE_OPERATIONS' },
        message: {
          type: 'string',
          example:
            'This user has active operations that must be completed or transferred before deactivation.',
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'users.USER_STATUS_CHANGE_FAILED' },
        message: {
          type: 'string',
          example: 'Failed to change user status. Please try again later.',
        },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  @Patch(':userId/status')
  async changeUserStatus(
    @Param('userId') userId: string,
    @Body() statusChangeDto: StatusChangeRequestDto,
    @AuthenticatedUser() user: any,
    @Headers('accept-language') acceptLanguage: string,
    @Ip() ipAddress: string,
    @Req() req: Request,
  ) {
    const userAgent = req.get('User-Agent') || 'Unknown';

    const result = await this.usersService.changeUserStatus(
      userId,
      statusChangeDto.status,
      statusChangeDto.reason,
      user.id, // Fixed: use user.id instead of user.userId
      user.tenantId,
    );

    const message = this.i18nService.translate(
      MessageKeys.USER_STATUS_CHANGED_SUCCESS,
      acceptLanguage,
    ).message;

    return {
      code: MessageKeys.USER_STATUS_CHANGED_SUCCESS,
      message,
      data: result,
    };
  }

  /**
   * ? - Bulk change user account status
   */
  @ApiOperation({
    summary: 'Bulk change user account status',
    description:
      'Allows authorized administrators to change status for multiple users simultaneously',
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'Language preference',
    required: true,
    example: 'en',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk status change completed',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'success.BULK_STATUS_CHANGE_COMPLETED',
          enum: [MessageKeys.BULK_STATUS_CHANGE_COMPLETED],
        },
        message: { type: 'string', example: 'Bulk status change completed' },
        data: {
          type: 'object',
          properties: {
            totalRequested: { type: 'number', example: 5 },
            successful: { type: 'number', example: 3 },
            failed: { type: 'number', example: 2 },
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  userId: {
                    type: 'string',
                    example: '123e4567-e89b-12d3-a456-426614174000',
                  },
                  status: {
                    type: 'string',
                    enum: ['success', 'failed'],
                    example: 'success',
                  },
                  previousStatus: {
                    type: 'string',
                    enum: [
                      'active',
                      'inactive',
                      'pending_verification',
                      'suspended',
                    ],
                    example: 'active',
                  },
                  newStatus: {
                    type: 'string',
                    enum: [
                      'active',
                      'inactive',
                      'pending_verification',
                      'suspended',
                    ],
                    example: 'inactive',
                  },
                  terminatedSessions: { type: 'number', example: 2 },
                  errorCode: {
                    type: 'string',
                    example: 'users.INSUFFICIENT_PERMISSIONS_STATUS_CHANGE',
                  },
                  errorMessage: {
                    type: 'string',
                    example:
                      'You do not have permission to change the status of this user.',
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'users.BULK_OPERATION_LIMIT_EXCEEDED',
        },
        message: {
          type: 'string',
          example:
            'Bulk operation limit exceeded. Maximum 50 users can be processed at once.',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired session',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'auth.SESSION_EXPIRED' },
        message: {
          type: 'string',
          example: 'Session has expired. Please login again',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'users.INSUFFICIENT_PERMISSIONS' },
        message: {
          type: 'string',
          example: 'You do not have permission to create users',
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'users.BULK_STATUS_CHANGE_FAILED' },
        message: {
          type: 'string',
          example:
            'Failed to complete bulk status change. Please try again later.',
        },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  @Patch('bulk-status')
  async bulkChangeUserStatus(
    @Body() bulkStatusChangeDto: BulkStatusChangeRequestDto,
    @AuthenticatedUser() user: any,
    @Headers('accept-language') acceptLanguage: string,
    @Ip() ipAddress: string,
    @Req() req: Request,
  ) {
    const userAgent = req.get('User-Agent') || 'Unknown';

    const result = await this.usersService.bulkChangeUserStatus(
      bulkStatusChangeDto.userIds,
      bulkStatusChangeDto.status,
      bulkStatusChangeDto.reason,
      user.id, // Fixed: use user.id instead of user.userId
      user.tenantId,
    );

    const message = this.i18nService.translate(
      MessageKeys.BULK_STATUS_CHANGE_COMPLETED,
      acceptLanguage,
    ).message;

    return {
      code: MessageKeys.BULK_STATUS_CHANGE_COMPLETED,
      message,
      data: result,
    };
  }
}
