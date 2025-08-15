import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Response } from 'express';
import { AuditLog } from '@/entities/audit-log.entity';
import { AuditExport } from '@/entities/audit-export.entity';
import { User } from '@/entities/user.entity';
import {
  RoleName,
  AuditAction,
  AuditStatus,
  ExportStatus,
  ExportFormat,
} from '@/common/enums';
import { MessageKeys } from '@/common/message-keys';
import { I18nService } from '@/i18n/i18n.service';
import { ListAuditLogsQueryDto } from '../dto/list-audit-logs-query.dto';
import { ExportAuditRequestDto } from '../dto/export-audit-request.dto';
import {
  AuditLogDataDto,
  PaginationInfoDto,
} from '../dto/list-audit-logs-response.dto';
import { ExportAuditDataDto } from '../dto/export-audit-response.dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectRepository(AuditExport)
    private auditExportRepository: Repository<AuditExport>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private i18nService: I18nService,
  ) {}

  /**
   * Retrieve audit logs with filtering and pagination
   */
  async getAuditLogs(
    currentUser: User,
    query: ListAuditLogsQueryDto,
    acceptLanguage?: string,
  ): Promise<{ auditLogs: AuditLogDataDto[]; pagination: PaginationInfoDto }> {
    // Check permissions - only tenant owners and admins can view audit logs
    const userRole = await this.getUserRole(
      currentUser.id,
      currentUser.tenantId,
    );
    if (!this.canViewAuditLogs(userRole)) {
      throw new ForbiddenException({ code: MessageKeys.AUDIT_ACCESS_DENIED });
    }

    // Validate date range
    if (query.dateFrom && query.dateTo) {
      const dateFrom = new Date(query.dateFrom);
      const dateTo = new Date(query.dateTo);
      if (dateFrom > dateTo) {
        throw new BadRequestException({
          code: MessageKeys.AUDIT_INVALID_DATE_RANGE,
        });
      }
    }

    // Build query
    const queryBuilder = this.buildAuditLogsQuery(
      currentUser.tenantId,
      userRole,
      query,
    );

    // Get total count for pagination
    const totalItems = await queryBuilder.getCount();

    // Apply pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // Apply sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    // Map frontend sort fields to database column names
    const sortFieldMap = {
      createdAt: 'auditLog.createdAt',
      actionType: 'auditLog.action',
      status: 'auditLog.status',
      actorUserId: 'auditLog.actorUserId',
    };

    const dbSortField = sortFieldMap[sortBy] || 'auditLog.createdAt';
    const dbSortOrder = sortOrder.toUpperCase() as 'ASC' | 'DESC';

    queryBuilder.orderBy(dbSortField, dbSortOrder);

    // Execute query
    const auditLogs = await queryBuilder.getMany();

    // Transform to DTOs with translation
    const auditLogDtos = auditLogs.map((log) =>
      this.transformToAuditLogDto(log, acceptLanguage),
    );

    // Calculate pagination info
    const totalPages = Math.ceil(totalItems / limit);
    const pagination: PaginationInfoDto = {
      page: page,
      limit: limit,
      total: totalItems,
      totalPages,
    };

    // Log the audit viewing activity
    await this.logAuditActivity(
      currentUser.id,
      currentUser.tenantId,
      AuditAction.AUDIT_LOGS_VIEWED,
      AuditStatus.SUCCESS,
      `Viewed audit logs with filters: ${JSON.stringify(query)}`,
    );

    return { auditLogs: auditLogDtos, pagination };
  }

  /**
   * Initiate audit data export
   */
  async initiateExport(
    currentUser: User,
    exportRequest: ExportAuditRequestDto,
  ): Promise<ExportAuditDataDto> {
    // Check permissions - only tenant owners and admins can export audit logs
    const userRole = await this.getUserRole(
      currentUser.id,
      currentUser.tenantId,
    );
    if (!this.canViewAuditLogs(userRole)) {
      throw new ForbiddenException({ code: MessageKeys.AUDIT_ACCESS_DENIED });
    }

    // Validate date range
    if (exportRequest.dateFrom && exportRequest.dateTo) {
      const dateFrom = new Date(exportRequest.dateFrom);
      const dateTo = new Date(exportRequest.dateTo);
      if (dateFrom > dateTo) {
        throw new BadRequestException({
          code: MessageKeys.AUDIT_INVALID_DATE_RANGE,
        });
      }
    }

    // Estimate record count for the export
    const countQuery = this.buildAuditLogsQuery(
      currentUser.tenantId,
      userRole,
      exportRequest,
    );
    const estimatedRecordCount = await countQuery.getCount();

    // Check if export size is too large (more than 10,000 records)
    if (estimatedRecordCount > 10000) {
      throw new BadRequestException({
        code: MessageKeys.AUDIT_EXPORT_TOO_LARGE,
      });
    }

    // For smaller exports (≤ 1000 records), provide immediate download
    if (estimatedRecordCount <= 1000) {
      return this.generateImmediateExport(
        currentUser,
        exportRequest,
        estimatedRecordCount,
      );
    }

    // For larger exports, initiate async processing
    return this.initiateAsyncExport(
      currentUser,
      exportRequest,
      estimatedRecordCount,
    );
  }

  /**
   * Generate immediate export for small datasets
   */
  private async generateImmediateExport(
    currentUser: User,
    exportRequest: ExportAuditRequestDto,
    recordCount: number,
  ): Promise<ExportAuditDataDto> {
    const userRole = await this.getUserRole(
      currentUser.id,
      currentUser.tenantId,
    );

    // Get actual audit logs data
    const query = this.buildAuditLogsQuery(
      currentUser.tenantId,
      userRole,
      exportRequest,
    );

    const auditLogs = await query.getMany();

    // Generate file content based on format
    let fileContent: string;
    let contentType: string;
    let fileExtension: string;

    switch (exportRequest.exportFormat) {
      case ExportFormat.CSV:
        fileContent = this.generateCSVContent(auditLogs);
        contentType = 'text/csv';
        fileExtension = 'csv';
        break;
      case ExportFormat.JSON:
        fileContent = this.generateJSONContent(auditLogs);
        contentType = 'application/json';
        fileExtension = 'json';
        break;
      default:
        // For now, default to CSV for unsupported formats
        fileContent = this.generateCSVContent(auditLogs);
        contentType = 'text/csv';
        fileExtension = 'csv';
    }

    // Create a temporary export record for tracking
    const auditExport = new AuditExport();
    auditExport.tenantId = currentUser.tenantId;
    auditExport.exportedBy = currentUser.id;
    auditExport.exportFormat = exportRequest.exportFormat;
    auditExport.status = ExportStatus.COMPLETED;
    auditExport.filtersApplied = this.buildFiltersObject(exportRequest);
    auditExport.dateRangeStart = exportRequest.dateFrom
      ? new Date(exportRequest.dateFrom)
      : undefined;
    auditExport.dateRangeEnd = exportRequest.dateTo
      ? new Date(exportRequest.dateTo)
      : undefined;
    auditExport.recordCount = recordCount;
    auditExport.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    auditExport.completedAt = new Date();

    const savedExport = await this.auditExportRepository.save(auditExport);

    // Log the export
    await this.logAuditActivity(
      currentUser.id,
      currentUser.tenantId,
      AuditAction.AUDIT_EXPORT_INITIATED,
      AuditStatus.SUCCESS,
      `Generated immediate audit export with format: ${exportRequest.exportFormat}, records: ${recordCount}`,
    );

    // Create downloadUrl for immediate access
    const filename = `audit-export-${new Date().toISOString().split('T')[0]}.${fileExtension}`;
    const downloadUrl = `/audit/download/${savedExport.id}`;

    return {
      exportId: savedExport.id,
      exportFormat: savedExport.exportFormat,
      status: ExportStatus.COMPLETED,
      estimatedRecordCount: recordCount,
      filtersApplied: savedExport.filtersApplied || {},
      expiresAt: savedExport.expiresAt!,
      downloadUrl,
    };
  }

  /**
   * Initiate async export for larger datasets
   */
  private async initiateAsyncExport(
    currentUser: User,
    exportRequest: ExportAuditRequestDto,
    estimatedRecordCount: number,
  ): Promise<ExportAuditDataDto> {
    // Create audit export record
    const auditExport = new AuditExport();
    auditExport.tenantId = currentUser.tenantId;
    auditExport.exportedBy = currentUser.id;
    auditExport.exportFormat = exportRequest.exportFormat;
    auditExport.status = ExportStatus.INITIATED;
    auditExport.filtersApplied = this.buildFiltersObject(exportRequest);
    auditExport.dateRangeStart = exportRequest.dateFrom
      ? new Date(exportRequest.dateFrom)
      : undefined;
    auditExport.dateRangeEnd = exportRequest.dateTo
      ? new Date(exportRequest.dateTo)
      : undefined;
    auditExport.recordCount = estimatedRecordCount;
    auditExport.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    const savedExport = await this.auditExportRepository.save(auditExport);

    // Log the export initiation
    await this.logAuditActivity(
      currentUser.id,
      currentUser.tenantId,
      AuditAction.AUDIT_EXPORT_INITIATED,
      AuditStatus.SUCCESS,
      `Initiated audit export with format: ${exportRequest.exportFormat}, estimated records: ${estimatedRecordCount}`,
    );

    // Return export information
    return {
      exportId: savedExport.id,
      exportFormat: savedExport.exportFormat,
      status: savedExport.status,
      estimatedRecordCount,
      filtersApplied: savedExport.filtersApplied || {},
      expiresAt: savedExport.expiresAt!,
      downloadUrl: undefined, // Will be set when export is completed
    };
  }

  /**
   * Generate CSV content from audit logs
   */
  private generateCSVContent(auditLogs: AuditLog[]): string {
    const headers = [
      'ID',
      'Timestamp',
      'Actor Name',
      'Actor Email',
      'Target Name',
      'Target Email',
      'Action',
      'Status',
      'Description',
      'IP Address',
      'User Agent',
    ];

    const rows = auditLogs.map((log) => [
      log.id,
      log.createdAt.toISOString(),
      log.actorUser?.fullName || '',
      log.actorUser?.email || '',
      log.targetUser?.fullName || '',
      log.targetUser?.email || '',
      log.action,
      log.status,
      log.details || '',
      log.ipAddress || '',
      log.userAgent || '',
    ]);

    // Escape CSV fields properly
    const escapeCsvField = (field: string) => {
      if (field.includes('"') || field.includes(',') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };

    const csvContent = [
      headers.map(escapeCsvField).join(','),
      ...rows.map((row) =>
        row.map((field) => escapeCsvField(String(field || ''))).join(','),
      ),
    ].join('\n');

    return csvContent;
  }

  /**
   * Generate JSON content from audit logs
   */
  private generateJSONContent(auditLogs: AuditLog[]): string {
    const data = auditLogs.map((log) => ({
      id: log.id,
      timestamp: log.createdAt.toISOString(),
      actor: {
        name: log.actorUser?.fullName || null,
        email: log.actorUser?.email || null,
      },
      target: log.targetUser
        ? {
            name: log.targetUser.fullName,
            email: log.targetUser.email,
          }
        : null,
      action: log.action,
      status: log.status,
      description: log.details || null,
      ipAddress: log.ipAddress || null,
      userAgent: log.userAgent || null,
    }));

    return JSON.stringify({ auditLogs: data }, null, 2);
  }

  /**
   * Download export file by ID
   */
  async downloadExport(
    exportId: string,
    currentUser: User,
  ): Promise<{ content: string; filename: string; contentType: string }> {
    // Find the export record
    const exportRecord = await this.auditExportRepository.findOne({
      where: { id: exportId, tenantId: currentUser.tenantId },
    });

    if (!exportRecord) {
      throw new NotFoundException({ code: 'audit.EXPORT_NOT_FOUND' });
    }

    // Check if export is completed
    if (exportRecord.status !== ExportStatus.COMPLETED) {
      throw new BadRequestException({ code: 'audit.EXPORT_NOT_READY' });
    }

    // Check if export has expired
    if (exportRecord.expiresAt && new Date() > exportRecord.expiresAt) {
      throw new BadRequestException({ code: 'audit.EXPORT_EXPIRED' });
    }

    // Get user role to rebuild query
    const userRole = await this.getUserRole(
      currentUser.id,
      currentUser.tenantId,
    );

    // Rebuild filters from stored data
    const filters = exportRecord.filtersApplied as any;
    const exportRequest: ExportAuditRequestDto = {
      exportFormat: exportRecord.exportFormat,
      ...filters,
    };

    // Get audit logs data
    const query = this.buildAuditLogsQuery(
      currentUser.tenantId,
      userRole,
      exportRequest,
    );

    const auditLogs = await query.getMany();

    // Generate file content
    let content: string;
    let contentType: string;
    let fileExtension: string;

    switch (exportRecord.exportFormat) {
      case ExportFormat.CSV:
        content = this.generateCSVContent(auditLogs);
        contentType = 'text/csv';
        fileExtension = 'csv';
        break;
      case ExportFormat.JSON:
        content = this.generateJSONContent(auditLogs);
        contentType = 'application/json';
        fileExtension = 'json';
        break;
      default:
        content = this.generateCSVContent(auditLogs);
        contentType = 'text/csv';
        fileExtension = 'csv';
    }

    const filename = `audit-export-${exportRecord.createdAt.toISOString().split('T')[0]}.${fileExtension}`;

    return { content, filename, contentType };
  }

  /**
   * Build audit logs query with filters
   */
  private buildAuditLogsQuery(
    tenantId: string,
    userRole: RoleName,
    filters: Partial<ListAuditLogsQueryDto & ExportAuditRequestDto>,
  ): SelectQueryBuilder<AuditLog> {
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('auditLog')
      .leftJoinAndSelect('auditLog.actorUser', 'actorUser')
      .leftJoinAndSelect('auditLog.targetUser', 'targetUser')
      .where('auditLog.tenantId = :tenantId', { tenantId });

    // Apply permission-based filtering
    if (userRole === RoleName.ADMIN) {
      // Admins cannot see actions performed by tenant owners or other admins
      queryBuilder.andWhere(
        `
        (auditLog.actorUserId IS NULL OR 
         auditLog.actorUserId NOT IN (
           SELECT ur.userId FROM user_roles ur 
           INNER JOIN roles r ON ur.roleId = r.id 
           WHERE ur.tenantId = :tenantId 
           AND ur.isActive = true 
           AND r.name IN (:...restrictedRoles)
         ))
      `,
        {
          tenantId,
          restrictedRoles: [RoleName.TENANT_OWNER, RoleName.ADMIN],
        },
      );
    }

    // Apply filters
    if (filters.userId) {
      // Support both UUID and username/email search
      const userId = filters.userId.trim();

      if (
        userId.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        )
      ) {
        // It's a UUID, search by actual user ID
        queryBuilder.andWhere(
          '(auditLog.actorUserId = :userId OR auditLog.targetUserId = :userId)',
          { userId },
        );
      } else {
        // It's not a UUID, search by username or email
        queryBuilder.andWhere(
          `(
            actorUser.fullName ILIKE :searchTerm OR 
            actorUser.email ILIKE :searchTerm OR
            targetUser.fullName ILIKE :searchTerm OR 
            targetUser.email ILIKE :searchTerm
          )`,
          { searchTerm: `%${userId}%` },
        );
      }
    }

    if (filters.action) {
      queryBuilder.andWhere('auditLog.action = :action', {
        action: filters.action,
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('auditLog.status = :status', {
        status: filters.status,
      });
    }

    if (filters.dateFrom) {
      // Handle date filtering - ensure we capture the full day
      const dateFrom = new Date(filters.dateFrom);
      queryBuilder.andWhere('auditLog.createdAt >= :dateFrom', {
        dateFrom: dateFrom,
      });
    }

    if (filters.dateTo) {
      // Handle date filtering - ensure we capture the full day by adding 23:59:59.999
      const dateTo = new Date(filters.dateTo);
      // If it's just a date (no time component), set to end of day
      if (filters.dateTo.match(/^\d{4}-\d{2}-\d{2}$/)) {
        dateTo.setHours(23, 59, 59, 999);
      }
      queryBuilder.andWhere('auditLog.createdAt <= :dateTo', {
        dateTo: dateTo,
      });
    }

    if (filters.ipAddress) {
      queryBuilder.andWhere('auditLog.ipAddress = :ipAddress', {
        ipAddress: filters.ipAddress,
      });
    }

    return queryBuilder;
  }

  /**
   * Transform audit log entity to DTO
   */
  private transformToAuditLogDto(
    auditLog: AuditLog,
    language?: string,
  ): AuditLogDataDto {
    // Get translated action type
    const actionTypeKey = `audit.actions.${auditLog.action}`;
    const translatedActionType = this.i18nService.translate(
      actionTypeKey,
      language,
    ).message;

    return {
      id: auditLog.id,
      tenantId: auditLog.tenantId,
      actorUserId: auditLog.actorUserId,
      actor: {
        id: auditLog.actorUserId || 'system',
        fullName: auditLog.actorUser?.fullName || 'Unknown User',
        email: auditLog.actorUser?.email || 'unknown@example.com',
      },
      targetUserId: auditLog.targetUserId,
      target: auditLog.targetUser
        ? {
            id: auditLog.targetUserId!,
            fullName: auditLog.targetUser.fullName,
            email: auditLog.targetUser.email,
          }
        : undefined,
      actionType: translatedActionType,
      rawActionType: auditLog.action, // Keep raw action for filtering
      description: auditLog.details || '',
      ipAddress: auditLog.ipAddress || '',
      userAgent: auditLog.userAgent || '',
      status: auditLog.status,
      metadata: {},
      createdAt: auditLog.createdAt,
    };
  }

  /**
   * Build filters object for export record
   */
  private buildFiltersObject(
    request: ExportAuditRequestDto,
  ): Record<string, any> {
    const filters: Record<string, any> = {};

    if (request.userId) filters.userId = request.userId;
    if (request.action) filters.action = request.action;
    if (request.dateFrom) filters.dateFrom = request.dateFrom;
    if (request.dateTo) filters.dateTo = request.dateTo;
    if (request.ipAddress) filters.ipAddress = request.ipAddress;

    return filters;
  }

  /**
   * Get user's role within the tenant
   */
  private async getUserRole(
    userId: string,
    tenantId: string,
  ): Promise<RoleName> {
    const userWithRole = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect(
        'user.userRoles',
        'userRole',
        'userRole.isActive = :isActive AND userRole.tenantId = :tenantId',
        { isActive: true, tenantId },
      )
      .leftJoinAndSelect('userRole.role', 'role')
      .where('user.id = :userId', { userId })
      .getOne();

    if (
      !userWithRole ||
      !userWithRole.userRoles ||
      userWithRole.userRoles.length === 0
    ) {
      throw new NotFoundException({ code: MessageKeys.USER_NOT_FOUND });
    }

    return userWithRole.userRoles[0].role.name as RoleName;
  }

  /**
   * Check if user role can view audit logs
   */
  private canViewAuditLogs(role: RoleName): boolean {
    return [RoleName.TENANT_OWNER, RoleName.ADMIN].includes(role);
  }

  /**
   * Log audit activity
   */
  private async logAuditActivity(
    actorUserId: string,
    tenantId: string,
    action: AuditAction,
    status: AuditStatus,
    details?: string,
    targetUserId?: string,
    failureReason?: string,
  ): Promise<void> {
    const auditLog = this.auditLogRepository.create({
      tenantId,
      actorUserId,
      targetUserId,
      action,
      status,
      details,
      failureReason,
    });

    await this.auditLogRepository.save(auditLog);
  }
}
