import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  HttpStatus,
  HttpCode,
  Headers,
  Res,
  Param,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuditService } from './services/audit.service';
import { SessionAuthGuard } from '@/auth/guards/session-auth.guard';
import { AuthenticatedUser } from '@/auth/decorators/authenticated-user.decorator';
import { User } from '@/entities/user.entity';
import { I18nService } from '@/i18n/i18n.service';
import { MessageKeys } from '@/common/message-keys';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { ExportAuditRequestDto } from './dto/export-audit-request.dto';
import { ListAuditLogsResponseDto } from './dto/list-audit-logs-response.dto';
import { ExportAuditResponseDto } from './dto/export-audit-response.dto';

@ApiTags('Audit Trail Management')
@Controller('audit')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth('session')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly i18nService: I18nService,
  ) {}

  @Get('logs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retrieve audit trail logs',
    description:
      'Get audit trail logs with filtering and pagination for security monitoring and compliance.',
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'Language preference',
    required: true,
    schema: { type: 'string', enum: ['fa', 'ar', 'en'] },
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
    schema: { type: 'integer', minimum: 1, default: 1 },
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of logs per page',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by specific user ID or search by username/email',
    schema: {
      type: 'string',
      example: '123e4567-e89b-12d3-a456-426614174000 or username',
    },
  })
  @ApiQuery({
    name: 'action',
    required: false,
    description: 'Filter by audit action type',
    schema: {
      type: 'string',
      enum: [
        'user_created',
        'user_updated',
        'user_deleted',
        'user_locked',
        'user_unlocked',
        'role_assigned',
        'role_removed',
        'password_reset_initiated',
        'password_reset_completed',
        'profile_updated',
        'password_changed',
        'session_terminated',
        'login_success',
        'login_failed',
        'logout',
        'audit_logs_viewed',
        'audit_export_initiated',
      ],
    },
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by audit status',
    schema: {
      type: 'string',
      enum: ['success', 'failed'],
    },
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    description: 'Filter logs from this date (ISO 8601 format)',
    schema: { type: 'string', format: 'date-time' },
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    description: 'Filter logs to this date (ISO 8601 format)',
    schema: { type: 'string', format: 'date-time' },
  })
  @ApiQuery({
    name: 'ipAddress',
    required: false,
    description: 'Filter by IP address',
    schema: { type: 'string' },
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort by field',
    schema: {
      type: 'string',
      enum: ['createdAt', 'actionType', 'status', 'actorUserId'],
      default: 'createdAt',
    },
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order',
    schema: {
      type: 'string',
      enum: ['asc', 'desc'],
      default: 'desc',
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Audit logs retrieved successfully',
    type: ListAuditLogsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid query parameters',
    schema: {
      example: {
        code: 'audit.INVALID_PARAMETERS',
        message: 'Invalid parameters provided',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
    schema: {
      example: {
        code: 'audit.ACCESS_DENIED',
        message:
          'Access denied. Only tenant owners and admins can view audit logs.',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
    schema: {
      example: {
        code: 'errors.INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    },
  })
  async getAuditLogs(
    @AuthenticatedUser() currentUser: User,
    @Query() query: ListAuditLogsQueryDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<ListAuditLogsResponseDto> {
    const result = await this.auditService.getAuditLogs(
      currentUser,
      query,
      acceptLanguage,
    );

    const message = this.i18nService.translate(
      MessageKeys.AUDIT_LOGS_RETRIEVED_SUCCESS,
      acceptLanguage,
    ).message;

    return {
      code: MessageKeys.AUDIT_LOGS_RETRIEVED_SUCCESS,
      message,
      data: result,
    };
  }

  @Post('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Export audit data for compliance',
    description:
      'Initiate export of filtered audit data for compliance reporting and analysis.',
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'Language preference',
    required: true,
    schema: { type: 'string', enum: ['fa', 'ar', 'en'] },
  })
  @ApiHeader({
    name: 'Content-Type',
    description: 'Content type',
    required: true,
    schema: { type: 'string', enum: ['application/json'] },
  })
  @ApiBody({
    type: ExportAuditRequestDto,
    description: 'Export parameters and filters',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Audit export initiated successfully',
    type: ExportAuditResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid export parameters',
    schema: {
      example: {
        code: 'audit.INVALID_PARAMETERS',
        message: 'Invalid export parameters provided',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
    schema: {
      example: {
        code: 'audit.ACCESS_DENIED',
        message:
          'Access denied. Only tenant owners and admins can export audit data.',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
    schema: {
      example: {
        code: 'errors.INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    },
  })
  async exportAuditData(
    @AuthenticatedUser() currentUser: User,
    @Body() exportRequest: ExportAuditRequestDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<ExportAuditResponseDto> {
    const result = await this.auditService.initiateExport(
      currentUser,
      exportRequest,
    );

    const message = this.i18nService.translate(
      MessageKeys.AUDIT_EXPORT_INITIATED_SUCCESS,
      acceptLanguage,
    ).message;

    return {
      code: MessageKeys.AUDIT_EXPORT_INITIATED_SUCCESS,
      message,
      data: result,
    };
  }

  @Get('download/:exportId')
  @ApiOperation({
    summary: 'Download export file',
    description: 'Download the generated export file by export ID.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Export file downloaded successfully',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Export not found',
    schema: {
      example: {
        code: 'audit.EXPORT_NOT_FOUND',
        message: 'Export not found',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Export not ready or expired',
    schema: {
      example: {
        code: 'audit.EXPORT_NOT_READY',
        message: 'Export is not ready for download',
      },
    },
  })
  async downloadExport(
    @AuthenticatedUser() currentUser: User,
    @Param('exportId') exportId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { content, filename, contentType } =
      await this.auditService.downloadExport(exportId, currentUser);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.send(content);
  }
}
