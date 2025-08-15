import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import * as crypto from 'crypto';
import { InventoryItem } from '../../entities/inventory-item.entity';
import { InventoryItemStatusChange } from '../../entities/inventory-item-status-change.entity';
import { InventoryExport } from '../../entities/inventory-export.entity';
import { SerialNumberSequence } from '../../entities/serial-number-sequence.entity';
import { Category } from '../../entities/category.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { User } from '../../entities/user.entity';
import { CreateInventoryItemRequestDto } from '../dto/create-inventory-item-request.dto';
import { UpdateInventoryItemRequestDto } from '../dto/update-inventory-item-request.dto';
import { ChangeInventoryItemStatusRequestDto } from '../dto/change-inventory-item-status-request.dto';
import { ListInventoryItemsQueryDto } from '../dto/list-inventory-items-query.dto';
import { ExportInventoryRequestDto } from '../dto/export-inventory-request.dto';
import { GetStatusHistoryQueryDto } from '../dto/get-status-history-query.dto';
import { InventoryItemDto } from '../dto/inventory-item.dto';
import { ItemChangeDto } from '../dto/update-inventory-item-response.dto';
import {
  StatusTransitionOptionDto,
  StatusRestrictionDto,
} from '../dto/get-status-options-response.dto';
import {
  StatusChangeHistoryDto,
  StatusHistoryPaginationDto,
} from '../dto/get-status-history-response.dto';
import { PaginationMeta } from '../dto/list-inventory-items-response.dto';
import {
  ItemType,
  AvailabilityStatus,
  InventoryItemStatus,
  StatusChangeType,
  AuditAction,
  AuditStatus,
  ExportFormat,
  ExportType,
  ExportStatus,
} from '../../common/enums';
import { MessageKeys } from '../../common/message-keys';
import { I18nService } from '../../i18n/i18n.service';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem)
    private readonly inventoryItemRepository: Repository<InventoryItem>,
    @InjectRepository(InventoryItemStatusChange)
    private readonly inventoryItemStatusChangeRepository: Repository<InventoryItemStatusChange>,
    @InjectRepository(InventoryExport)
    private readonly inventoryExportRepository: Repository<InventoryExport>,
    @InjectRepository(SerialNumberSequence)
    private readonly serialNumberSequenceRepository: Repository<SerialNumberSequence>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly dataSource: DataSource,
    private readonly i18nService: I18nService,
  ) {}

  /**
   * Create a new inventory item
   */
  async createInventoryItem(
    tenantId: string,
    userId: string,
    createDto: CreateInventoryItemRequestDto,
  ): Promise<InventoryItemDto> {
    return this.dataSource.transaction(async (manager) => {
      // Validate category exists and belongs to tenant
      const category = await manager.findOne(Category, {
        where: { id: createDto.categoryId, tenantId: tenantId },
      });

      if (!category) {
        throw new NotFoundException({ code: MessageKeys.CATEGORY_NOT_FOUND });
      }

      // Check if item name already exists in tenant
      const existingItem = await manager.findOne(InventoryItem, {
        where: { name: createDto.name, tenant_id: tenantId },
      });

      if (existingItem) {
        throw new ConflictException({
          code: MessageKeys.INVENTORY_NAME_EXISTS,
        });
      }

      let serialNumber: string | undefined;

      // Handle serialized items
      if (createDto.itemType === ItemType.SERIALIZED) {
        if (createDto.autoGenerateSerial) {
          serialNumber = await this.generateSerialNumber(tenantId, manager);
        } else if (createDto.serialNumber) {
          // Validate manual serial number uniqueness
          await this.validateSerialNumberUniqueness(
            tenantId,
            createDto.serialNumber,
            manager,
          );
          serialNumber = createDto.serialNumber;
        } else {
          throw new BadRequestException({
            code: MessageKeys.SERIAL_NUMBER_REQUIRED,
          });
        }
      }

      // Validate non-serialized items have quantity
      if (
        createDto.itemType === ItemType.NON_SERIALIZED &&
        createDto.quantity === undefined
      ) {
        throw new BadRequestException({
          code: MessageKeys.INVENTORY_QUANTITY_INVALID,
        });
      }

      // Create inventory item
      const inventoryItem = manager.create(InventoryItem, {
        name: createDto.name,
        description: createDto.description,
        tenant_id: tenantId,
        category_id: createDto.categoryId,
        item_type: createDto.itemType,
        serial_number: serialNumber,
        quantity: createDto.quantity,
        quantity_unit: createDto.quantityUnit,
        availability_status: AvailabilityStatus.AVAILABLE,
        status: InventoryItemStatus.ACTIVE,
      });

      const savedItem = await manager.save(InventoryItem, inventoryItem);

      // Create audit log
      await this.createAuditLog(
        tenantId,
        userId,
        AuditAction.INVENTORY_ITEM_CREATED,
        savedItem.id,
        `Created inventory item: ${savedItem.name}`,
        {
          itemName: savedItem.name,
          itemType: savedItem.item_type,
          serialNumber: savedItem.serial_number,
          categoryId: savedItem.category_id,
        },
        manager,
      );

      // Load item with category for response
      const itemWithCategory = await manager.findOne(InventoryItem, {
        where: { id: savedItem.id },
        relations: ['category'],
      });

      return this.mapToInventoryItemDto(itemWithCategory!);
    });
  }

  /**
   * List inventory items with pagination and filters
   */
  async listInventoryItems(
    tenantId: string,
    queryDto: ListInventoryItemsQueryDto,
    userId?: string,
  ): Promise<{ items: InventoryItemDto[]; meta: PaginationMeta }> {
    const queryBuilder = this.inventoryItemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.category', 'category')
      .where('item.tenant_id = :tenantId', { tenantId });

    // Apply status filter - if status is specified, filter by it; otherwise exclude archived
    if (queryDto.status) {
      queryBuilder.andWhere('item.status = :status', {
        status: queryDto.status,
      });
    } else {
      // Default behavior: exclude archived items unless specifically requested
      queryBuilder.andWhere('item.status != :archivedStatus', {
        archivedStatus: InventoryItemStatus.ARCHIVED,
      });
    }

    // Apply filters
    if (queryDto.search) {
      queryBuilder.andWhere('item.name ILIKE :search', {
        search: `%${queryDto.search}%`,
      });
    }

    if (queryDto.categoryId) {
      queryBuilder.andWhere('item.category_id = :categoryId', {
        categoryId: queryDto.categoryId,
      });
    }

    if (queryDto.itemType) {
      queryBuilder.andWhere('item.item_type = :itemType', {
        itemType: queryDto.itemType,
      });
    }

    if (queryDto.availabilityStatus) {
      queryBuilder.andWhere('item.availability_status = :availabilityStatus', {
        availabilityStatus: queryDto.availabilityStatus,
      });
    }

    // Apply sorting
    const sortField =
      queryDto.sortBy === 'name'
        ? 'item.name'
        : queryDto.sortBy === 'createdAt'
          ? 'item.created_at'
          : 'item.updated_at';
    queryBuilder.orderBy(
      sortField,
      queryDto.sortOrder?.toUpperCase() as 'ASC' | 'DESC',
    );

    // Apply pagination
    const offset = (queryDto.page! - 1) * queryDto.limit!;
    queryBuilder.skip(offset).take(queryDto.limit!);

    const [items, total] = await queryBuilder.getManyAndCount();

    // Create audit log for list viewing if userId is provided
    if (userId) {
      await this.createAuditLog(
        tenantId,
        userId,
        AuditAction.INVENTORY_LIST_VIEWED,
        '',
        'Viewed inventory items list',
        {
          filters: {
            search: queryDto.search,
            categoryId: queryDto.categoryId,
            itemType: queryDto.itemType,
            availabilityStatus: queryDto.availabilityStatus,
          },
          sorting: { sortBy: queryDto.sortBy, sortOrder: queryDto.sortOrder },
          pagination: { page: queryDto.page, limit: queryDto.limit },
          resultCount: items.length,
        },
      );
    }

    const totalPages = Math.ceil(total / queryDto.limit!);
    const meta: PaginationMeta = {
      page: queryDto.page!,
      limit: queryDto.limit!,
      total,
      totalPages,
      hasNext: queryDto.page! < totalPages,
      hasPrevious: queryDto.page! > 1,
    };

    return {
      items: items.map((item) => this.mapToInventoryItemDto(item)),
      meta,
    };
  }

  /**
   * Get inventory item by ID
   */
  async getInventoryItem(
    tenantId: string,
    itemId: string,
    userId?: string,
  ): Promise<InventoryItemDto> {
    const item = await this.inventoryItemRepository.findOne({
      where: { id: itemId, tenant_id: tenantId },
      relations: ['category'],
    });

    if (!item) {
      throw new NotFoundException({
        code: MessageKeys.INVENTORY_ITEM_NOT_FOUND,
      });
    }

    // Create audit log for item viewing if userId is provided
    if (userId) {
      await this.createAuditLog(
        tenantId,
        userId,
        AuditAction.INVENTORY_ITEM_VIEWED,
        itemId,
        `Viewed inventory item: ${item.name}`,
        {
          itemName: item.name,
          itemType: item.item_type,
          serialNumber: item.serial_number,
          categoryId: item.category_id,
          availabilityStatus: item.availability_status,
        },
      );
    }

    return this.mapToInventoryItemDto(item);
  }

  /**
   * Validate serial number uniqueness
   */
  async validateSerialNumber(
    tenantId: string,
    serialNumber: string,
  ): Promise<{ isUnique: boolean }> {
    const existingItem = await this.inventoryItemRepository.findOne({
      where: { tenant_id: tenantId, serial_number: serialNumber },
    });

    return { isUnique: !existingItem };
  }

  /**
   * Generate next serial number for tenant
   */
  async generateSerialNumber(tenantId: string, manager?: any): Promise<string> {
    const repo = manager || this.dataSource;

    // Get or create serial number sequence for tenant
    let sequence = await repo.findOne(SerialNumberSequence, {
      where: { tenant_id: tenantId, is_active: true },
    });

    if (!sequence) {
      sequence = repo.create(SerialNumberSequence, {
        tenant_id: tenantId,
        prefix: 'SN',
        current_number: 1,
        padding_length: 8,
        is_active: true,
      });
      sequence = await repo.save(SerialNumberSequence, sequence);
    }

    // Generate serial number
    const serialNumber = sequence.generateSerialNumber();

    // Increment sequence
    sequence.incrementSequence();
    await repo.save(SerialNumberSequence, sequence);

    return serialNumber;
  }

  /**
   * Validate serial number uniqueness (internal method)
   */
  private async validateSerialNumberUniqueness(
    tenantId: string,
    serialNumber: string,
    manager: any,
  ): Promise<void> {
    const existingItem = await manager.findOne(InventoryItem, {
      where: { tenant_id: tenantId, serial_number: serialNumber },
    });

    if (existingItem) {
      throw new ConflictException({ code: MessageKeys.SERIAL_NUMBER_EXISTS });
    }
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(
    tenantId: string,
    userId: string,
    action: AuditAction,
    resourceId: string,
    description: string,
    details: any,
    manager?: any,
  ): Promise<void> {
    const auditLogData = {
      tenantId,
      actorUserId: userId,
      action,
      details: JSON.stringify(details),
      status: AuditStatus.SUCCESS,
    };

    if (manager) {
      // Using transaction manager
      const auditLog = manager.create(AuditLog, auditLogData);
      await manager.save(auditLog);
    } else {
      // Using repository directly
      const auditLog = this.auditLogRepository.create(auditLogData);
      await this.auditLogRepository.save(auditLog);
    }
  }

  /**
   * Initiate inventory export
   */
  async initiateInventoryExport(
    tenantId: string,
    userId: string,
    exportDto: ExportInventoryRequestDto,
    ipAddress: string,
    userAgent?: string,
  ): Promise<{
    exportId: string;
    status: ExportStatus;
    recordCount: number;
    downloadUrl?: string;
    expiresAt: Date;
    estimatedCompletionTime: Date;
  }> {
    return this.dataSource.transaction(async (manager) => {
      // Validate export request
      if (
        exportDto.exportType !== ExportType.FULL_INVENTORY &&
        (!exportDto.itemIds || exportDto.itemIds.length === 0)
      ) {
        throw new BadRequestException({
          code: MessageKeys.EXPORT_INVALID_ITEMS,
        });
      }

      let itemIds: string[] = [];
      let recordCount = 0;

      if (exportDto.exportType === ExportType.FULL_INVENTORY) {
        // Get all item IDs for the tenant
        const items = await manager.find(InventoryItem, {
          where: { tenant_id: tenantId, status: InventoryItemStatus.ACTIVE },
          select: ['id'],
        });
        itemIds = items.map((item) => item.id);
        recordCount = items.length;
      } else {
        // Validate that all requested items exist and belong to the tenant
        const items = await manager.find(InventoryItem, {
          where: {
            id: exportDto.itemIds ? exportDto.itemIds[0] : '', // This will be updated with proper IN query
            tenant_id: tenantId,
          },
        });

        if (exportDto.itemIds) {
          const validItems = await manager
            .createQueryBuilder(InventoryItem, 'item')
            .where('item.id IN (:...ids)', { ids: exportDto.itemIds })
            .andWhere('item.tenant_id = :tenantId', { tenantId })
            .getMany();

          if (validItems.length !== exportDto.itemIds.length) {
            throw new BadRequestException({
              code: MessageKeys.EXPORT_INVALID_ITEMS,
            });
          }

          itemIds = exportDto.itemIds;
          recordCount = validItems.length;
        }
      }

      // Check if export is too large (limit to 1000 items)
      if (recordCount > 1000) {
        throw new BadRequestException({ code: MessageKeys.EXPORT_TOO_LARGE });
      }

      // Create export record
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // Expire in 24 hours

      const estimatedCompletionTime = new Date();
      estimatedCompletionTime.setMinutes(
        estimatedCompletionTime.getMinutes() + Math.ceil(recordCount / 100),
      ); // Estimate 1 minute per 100 items

      const inventoryExport = manager.create(InventoryExport, {
        tenant_id: tenantId,
        exported_by: userId,
        export_format: exportDto.exportFormat,
        export_type: exportDto.exportType,
        item_ids: itemIds,
        export_options: exportDto.exportOptions || {},
        record_count: recordCount,
        ip_address: ipAddress,
        user_agent: userAgent,
        status: ExportStatus.INITIATED,
        expires_at: expiresAt,
      });

      const savedExport = await manager.save(InventoryExport, inventoryExport);

      // Create audit log
      await this.createAuditLog(
        tenantId,
        userId,
        AuditAction.INVENTORY_EXPORTED,
        savedExport.id,
        `Initiated inventory export: ${exportDto.exportType}`,
        {
          exportFormat: exportDto.exportFormat,
          exportType: exportDto.exportType,
          recordCount,
          itemIds:
            exportDto.exportType === ExportType.FULL_INVENTORY ? [] : itemIds,
          exportOptions: exportDto.exportOptions,
        },
        manager,
      );

      return {
        exportId: savedExport.id,
        status: savedExport.status,
        recordCount: savedExport.record_count,
        downloadUrl: `/api/inventory/export/${savedExport.id}/download`, // Set download URL immediately
        expiresAt: savedExport.expires_at,
        estimatedCompletionTime,
      };
    });
  }

  /**
   * Download export file
   */
  async downloadExport(
    tenantId: string,
    exportId: string,
  ): Promise<{
    content: string;
    contentType: string;
    filename: string;
  }> {
    // Find the export record
    const exportRecord = await this.inventoryExportRepository.findOne({
      where: { id: exportId, tenant_id: tenantId },
    });

    if (!exportRecord) {
      throw new NotFoundException({ code: MessageKeys.EXPORT_NOT_FOUND });
    }

    // Check if export has expired
    if (new Date() > exportRecord.expires_at) {
      throw new NotFoundException({ code: MessageKeys.EXPORT_EXPIRED });
    }

    // Get the items to export
    const items = await this.inventoryItemRepository.find({
      where: {
        id: exportRecord.item_ids?.length
          ? In(exportRecord.item_ids)
          : undefined,
        tenant_id: tenantId,
      },
      relations: ['category'],
    });

    // Generate content based on format
    let content: string;
    let contentType: string;
    let fileExtension: string;

    switch (exportRecord.export_format) {
      case ExportFormat.JSON:
        content = JSON.stringify(
          items.map((item) => this.mapToInventoryItemDto(item)),
          null,
          2,
        );
        contentType = 'application/json';
        fileExtension = 'json';
        break;

      case ExportFormat.CSV:
        // Simple CSV implementation
        const csvHeaders = [
          'ID',
          'Name',
          'Type',
          'Category',
          'Status',
          'Serial Number',
          'Quantity',
        ];
        const csvRows = items.map((item) => [
          item.id,
          `"${item.name}"`,
          item.item_type,
          `"${item.category?.name || 'N/A'}"`,
          item.availability_status,
          item.serial_number || 'N/A',
          item.quantity?.toString() || 'N/A',
        ]);
        content = [
          csvHeaders.join(','),
          ...csvRows.map((row) => row.join(',')),
        ].join('\n');
        contentType = 'text/csv';
        fileExtension = 'csv';
        break;

      case ExportFormat.PDF:
      case ExportFormat.EXCEL:
      default:
        // For now, return JSON for PDF and Excel until proper libraries are added
        content = JSON.stringify(
          items.map((item) => this.mapToInventoryItemDto(item)),
          null,
          2,
        );
        contentType = 'application/json';
        fileExtension = 'json';
        break;
    }

    // Update download count
    await this.inventoryExportRepository.update(exportId, {
      download_count: exportRecord.download_count + 1,
      last_downloaded_at: new Date(),
    });

    const today = new Date().toISOString().split('T')[0];
    const filename = `inventory-export-${today}.${fileExtension}`;

    return {
      content,
      contentType,
      filename,
    };
  }

  /**
   * Map entity to DTO
   */
  private mapToInventoryItemDto(item: InventoryItem): InventoryItemDto {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      categoryId: item.category_id,
      categoryName: item.category?.name || '',
      itemType: item.item_type,
      serialNumber: item.serial_number,
      quantity: item.quantity,
      quantityUnit: item.quantity_unit,
      availabilityStatus: item.availability_status,
      status: item.status,
      version: item.version,
      hasRentalHistory: item.has_rental_history,
      lastStatusChangeReason: item.last_status_change_reason,
      expectedResolutionDate: item.expected_resolution_date,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };
  }

  /**
   * Update an existing inventory item (?)
   */
  async updateInventoryItem(
    tenantId: string,
    userId: string,
    itemId: string,
    updateDto: UpdateInventoryItemRequestDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ item: InventoryItemDto; changes: ItemChangeDto[] }> {
    return this.dataSource.transaction(async (manager) => {
      // Find the existing item with current version for optimistic locking
      const existingItem = await manager.findOne(InventoryItem, {
        where: { id: itemId, tenant_id: tenantId },
        relations: ['category'],
      });

      if (!existingItem) {
        throw new NotFoundException({
          code: MessageKeys.INVENTORY_ITEM_NOT_FOUND,
        });
      }

      // Check optimistic locking
      if (existingItem.version !== updateDto.version) {
        throw new ConflictException({
          code: MessageKeys.EDIT_CONFLICT,
          details: {
            currentVersion: existingItem.version,
            submittedVersion: updateDto.version,
          },
        });
      }

      // Validate category exists and belongs to tenant
      const category = await manager.findOne(Category, {
        where: { id: updateDto.categoryId, tenantId: tenantId },
      });

      if (!category) {
        throw new NotFoundException({ code: MessageKeys.CATEGORY_NOT_FOUND });
      }

      // Check if name is unique within tenant (if changed)
      if (existingItem.name !== updateDto.name) {
        const existingWithName = await manager.findOne(InventoryItem, {
          where: { name: updateDto.name, tenant_id: tenantId },
        });

        if (existingWithName) {
          throw new ConflictException({
            code: MessageKeys.INVENTORY_NAME_EXISTS,
          });
        }
      }

      // Track changes for audit trail
      const changes: ItemChangeDto[] = [];

      if (existingItem.name !== updateDto.name) {
        changes.push({
          field: 'name',
          oldValue: existingItem.name,
          newValue: updateDto.name,
        });
      }

      if (existingItem.description !== updateDto.description) {
        changes.push({
          field: 'description',
          oldValue: existingItem.description || undefined,
          newValue: updateDto.description || undefined,
        });
      }

      if (existingItem.category_id !== updateDto.categoryId) {
        changes.push({
          field: 'categoryId',
          oldValue: existingItem.category_id,
          newValue: updateDto.categoryId,
        });
      }

      if (existingItem.status !== updateDto.status) {
        changes.push({
          field: 'status',
          oldValue: existingItem.status,
          newValue: updateDto.status,
        });
      }

      // Update the item
      await manager.update(
        InventoryItem,
        { id: itemId },
        {
          name: updateDto.name,
          description: updateDto.description,
          category_id: updateDto.categoryId,
          status: updateDto.status,
          version: existingItem.version + 1, // Increment version for optimistic locking
        },
      );

      // Reload with relations
      const reloadedItem = await manager.findOne(InventoryItem, {
        where: { id: itemId },
        relations: ['category'],
      });

      if (!reloadedItem) {
        throw new NotFoundException({
          code: MessageKeys.INVENTORY_ITEM_NOT_FOUND,
        });
      }

      // Create audit log entry
      await manager.save(AuditLog, {
        tenantId: tenantId,
        actorUserId: userId,
        targetUserId: undefined,
        action: AuditAction.INVENTORY_ITEM_UPDATED,
        status: AuditStatus.SUCCESS,
        details: JSON.stringify({
          itemId: itemId,
          changes: changes,
        }),
        ipAddress: ipAddress,
        userAgent: userAgent,
      });

      return {
        item: this.mapToInventoryItemDto(reloadedItem),
        changes: changes,
      };
    });
  }

  /**
   * Change inventory item status (?)
   */
  async changeInventoryItemStatus(
    tenantId: string,
    userId: string,
    itemId: string,
    statusDto: ChangeInventoryItemStatusRequestDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    itemId: string;
    previousStatus: AvailabilityStatus;
    newStatus: AvailabilityStatus;
    changeReason?: string;
    expectedResolutionDate?: Date;
    changeId: string;
    changedAt: Date;
  }> {
    return this.dataSource.transaction(async (manager) => {
      // Find the existing item
      const existingItem = await manager.findOne(InventoryItem, {
        where: { id: itemId, tenant_id: tenantId },
      });

      if (!existingItem) {
        throw new NotFoundException({
          code: MessageKeys.INVENTORY_ITEM_NOT_FOUND,
        });
      }

      // Validate status transition
      const validTransitions = this.getValidStatusTransitions(
        existingItem.availability_status,
      );
      if (!validTransitions.includes(statusDto.newStatus)) {
        throw new BadRequestException({
          code: MessageKeys.INVENTORY_INVALID_STATUS_TRANSITION,
          details: {
            currentStatus: existingItem.availability_status,
            requestedStatus: statusDto.newStatus,
            validTransitions: validTransitions,
          },
        });
      }

      // Check if item is currently allocated (placeholder - would check actual rental system)
      if (
        existingItem.availability_status === AvailabilityStatus.RENTED &&
        statusDto.newStatus !== AvailabilityStatus.AVAILABLE
      ) {
        throw new ConflictException({
          code: MessageKeys.ITEM_ALLOCATED,
          details: {
            allocationType: 'rental',
            allocationDetails: {
              customerId: 'placeholder-customer-id',
              startDate: new Date().toISOString(),
              endDate: new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              canOverride: false,
            },
          },
        });
      }

      const previousStatus = existingItem.availability_status;
      const expectedResolutionDate =
        statusDto.expectedResolutionDate &&
        statusDto.expectedResolutionDate.trim() !== ''
          ? new Date(statusDto.expectedResolutionDate)
          : undefined;

      // Update item status
      await manager.update(
        InventoryItem,
        { id: itemId },
        {
          availability_status: statusDto.newStatus,
          last_status_change_reason: statusDto.changeReason,
          expected_resolution_date: expectedResolutionDate || undefined,
        },
      );

      // Create status change record
      const statusChangeData = manager.create(InventoryItemStatusChange, {
        inventory_item_id: itemId,
        tenant_id: tenantId,
        changed_by: userId,
        previous_status: previousStatus,
        new_status: statusDto.newStatus,
        change_reason: statusDto.changeReason,
        expected_resolution_date: expectedResolutionDate || undefined,
        change_type: StatusChangeType.MANUAL,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      const statusChange = await manager.save(statusChangeData);

      // Create audit log entry
      await manager.save(AuditLog, {
        tenantId: tenantId,
        actorUserId: userId,
        targetUserId: undefined,
        action: AuditAction.INVENTORY_STATUS_CHANGED,
        status: AuditStatus.SUCCESS,
        details: JSON.stringify({
          itemId: itemId,
          previousStatus: previousStatus,
          newStatus: statusDto.newStatus,
          changeReason: statusDto.changeReason,
          expectedResolutionDate: expectedResolutionDate?.toISOString(),
        }),
        ipAddress: ipAddress,
        userAgent: userAgent,
      });

      return {
        itemId: itemId,
        previousStatus: previousStatus,
        newStatus: statusDto.newStatus,
        changeReason: statusDto.changeReason,
        expectedResolutionDate: expectedResolutionDate,
        changeId: statusChange.id,
        changedAt: statusChange.created_at,
      };
    });
  }

  /**
   * Get valid status transition options for an inventory item
   */
  async getStatusOptions(
    tenantId: string,
    itemId: string,
  ): Promise<{
    currentStatus: AvailabilityStatus;
    validTransitions: StatusTransitionOptionDto[];
    restrictions: StatusRestrictionDto[];
  }> {
    const item = await this.inventoryItemRepository.findOne({
      where: { id: itemId, tenant_id: tenantId },
    });

    if (!item) {
      throw new NotFoundException({
        code: MessageKeys.INVENTORY_ITEM_NOT_FOUND,
      });
    }

    const currentStatus = item.availability_status;
    const validTransitions = this.getValidStatusTransitions(currentStatus);
    const restrictions: StatusRestrictionDto[] = [];

    // Add restrictions based on business rules
    if (item.availability_status === AvailabilityStatus.RENTED) {
      restrictions.push({
        status: AvailabilityStatus.RENTED,
        reason: this.i18nService.translate(MessageKeys.ITEM_RENTED_OUT).message,
      });
    }

    const transitionOptions: StatusTransitionOptionDto[] = validTransitions.map(
      (status) => ({
        status: status,
        label: this.getStatusLabel(status),
        requiresReason: this.statusRequiresReason(status),
        requiresResolutionDate: this.statusRequiresResolutionDate(status),
      }),
    );

    return {
      currentStatus: currentStatus,
      validTransitions: transitionOptions,
      restrictions: restrictions,
    };
  }

  /**
   * Get status change history for an inventory item
   */
  async getStatusHistory(
    tenantId: string,
    itemId: string,
    queryDto: GetStatusHistoryQueryDto,
  ): Promise<{
    statusChanges: StatusChangeHistoryDto[];
    pagination: StatusHistoryPaginationDto;
  }> {
    // Verify item exists and belongs to tenant
    const item = await this.inventoryItemRepository.findOne({
      where: { id: itemId, tenant_id: tenantId },
    });

    if (!item) {
      throw new NotFoundException({
        code: MessageKeys.INVENTORY_ITEM_NOT_FOUND,
      });
    }

    const page = queryDto.page || 1;
    const limit = queryDto.limit || 20;
    const offset = (page - 1) * limit;

    // Get status changes with pagination
    const [statusChanges, totalCount] =
      await this.inventoryItemStatusChangeRepository.findAndCount({
        where: { inventory_item_id: itemId, tenant_id: tenantId },
        relations: ['changedBy'],
        order: { created_at: 'DESC' },
        take: limit,
        skip: offset,
      });

    const totalPages = Math.ceil(totalCount / limit);

    const statusChangeHistory: StatusChangeHistoryDto[] = statusChanges.map(
      (change) => ({
        id: change.id,
        previousStatus: change.previous_status,
        newStatus: change.new_status,
        changeReason: change.change_reason,
        expectedResolutionDate: change.expected_resolution_date?.toISOString(),
        changeType: change.change_type,
        changedBy: {
          id: change.changedBy.id,
          fullName: change.changedBy.fullName,
        },
        createdAt: change.created_at.toISOString(),
      }),
    );

    const pagination: StatusHistoryPaginationDto = {
      currentPage: page,
      totalPages: totalPages,
      totalItems: totalCount,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    return {
      statusChanges: statusChangeHistory,
      pagination: pagination,
    };
  }

  /**
   * Get valid status transitions based on current status
   */
  private getValidStatusTransitions(
    currentStatus: AvailabilityStatus,
  ): AvailabilityStatus[] {
    const transitions: Record<AvailabilityStatus, AvailabilityStatus[]> = {
      [AvailabilityStatus.AVAILABLE]: [
        AvailabilityStatus.RENTED,
        AvailabilityStatus.MAINTENANCE,
        AvailabilityStatus.DAMAGED,
        AvailabilityStatus.LOST,
      ],
      [AvailabilityStatus.RENTED]: [
        AvailabilityStatus.AVAILABLE,
        AvailabilityStatus.DAMAGED,
        AvailabilityStatus.LOST,
      ],
      [AvailabilityStatus.MAINTENANCE]: [
        AvailabilityStatus.AVAILABLE,
        AvailabilityStatus.DAMAGED,
        AvailabilityStatus.LOST,
      ],
      [AvailabilityStatus.DAMAGED]: [
        AvailabilityStatus.AVAILABLE,
        AvailabilityStatus.MAINTENANCE,
        AvailabilityStatus.LOST,
      ],
      [AvailabilityStatus.LOST]: [AvailabilityStatus.AVAILABLE],
    };

    return transitions[currentStatus] || [];
  }

  /**
   * Get human-readable label for status
   */
  private getStatusLabel(status: AvailabilityStatus): string {
    const labels: Record<AvailabilityStatus, string> = {
      [AvailabilityStatus.AVAILABLE]: 'Available',
      [AvailabilityStatus.RENTED]: 'Rented',
      [AvailabilityStatus.MAINTENANCE]: 'Under Maintenance',
      [AvailabilityStatus.DAMAGED]: 'Damaged',
      [AvailabilityStatus.LOST]: 'Lost',
    };

    return labels[status] || status;
  }

  /**
   * Check if status requires a reason
   */
  private statusRequiresReason(status: AvailabilityStatus): boolean {
    return [
      AvailabilityStatus.MAINTENANCE,
      AvailabilityStatus.DAMAGED,
      AvailabilityStatus.LOST,
    ].includes(status);
  }

  /**
   * Check if status requires a resolution date
   */
  private statusRequiresResolutionDate(status: AvailabilityStatus): boolean {
    return [
      AvailabilityStatus.MAINTENANCE,
      AvailabilityStatus.DAMAGED,
    ].includes(status);
  }

  /**
   * Update serialized item specific fields (?)
   */
  async updateSerializedItem(
    tenantId: string,
    userId: string,
    itemId: string,
    updateDto: {
      serialNumber?: string;
      serialNumberSource?: 'auto_generated' | 'manual';
      conditionNotes?: string;
      lastMaintenanceDate?: Date;
      nextMaintenanceDueDate?: Date;
      confirmSerialNumberChange?: boolean;
    },
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    item: InventoryItemDto;
    changes: {
      field: string;
      oldValue: string | null;
      newValue: string | null;
    }[];
    serialNumberChanged: boolean;
    historicalLinkMaintained: boolean;
  }> {
    return this.dataSource.transaction(async (manager) => {
      // Find the existing item
      const existingItem = await manager.findOne(InventoryItem, {
        where: { id: itemId, tenant_id: tenantId },
        relations: ['category'],
      });

      if (!existingItem) {
        throw new NotFoundException({
          code: MessageKeys.INVENTORY_ITEM_NOT_FOUND,
        });
      }

      // Validate it's a serialized item
      if (existingItem.item_type !== ItemType.SERIALIZED) {
        throw new BadRequestException({
          code: MessageKeys.NOT_SERIALIZED_ITEM,
        });
      }

      const changes: {
        field: string;
        oldValue: string | null;
        newValue: string | null;
      }[] = [];
      let serialNumberChanged = false;
      let historicalLinkMaintained = false;

      // Handle serial number change
      if (
        updateDto.serialNumber !== undefined &&
        updateDto.serialNumber !== existingItem.serial_number
      ) {
        // Check if item has rental history and requires confirmation
        if (
          existingItem.has_rental_history &&
          !updateDto.confirmSerialNumberChange
        ) {
          throw new UnprocessableEntityException({
            code: MessageKeys.SERIAL_NUMBER_CHANGE_CONFIRMATION_REQUIRED,
          });
        }

        // Validate new serial number is unique
        if (updateDto.serialNumber) {
          const existingWithSerial = await manager.findOne(InventoryItem, {
            where: {
              serial_number: updateDto.serialNumber,
              tenant_id: tenantId,
            },
          });

          if (existingWithSerial) {
            throw new ConflictException({
              code: MessageKeys.SERIAL_NUMBER_EXISTS,
            });
          }
        }

        // Store previous serial number for historical tracking
        existingItem.previous_serial_number = existingItem.serial_number;
        existingItem.serial_number = updateDto.serialNumber;
        serialNumberChanged = true;
        historicalLinkMaintained = !!existingItem.has_rental_history;

        changes.push({
          field: 'serialNumber',
          oldValue: existingItem.previous_serial_number || null,
          newValue: updateDto.serialNumber || null,
        });
      }

      // Handle other fields
      if (
        updateDto.serialNumberSource !== undefined &&
        updateDto.serialNumberSource !== existingItem.serial_number_source
      ) {
        changes.push({
          field: 'serialNumberSource',
          oldValue: existingItem.serial_number_source || null,
          newValue: updateDto.serialNumberSource,
        });
        existingItem.serial_number_source = updateDto.serialNumberSource;
      }

      if (
        updateDto.conditionNotes !== undefined &&
        updateDto.conditionNotes !== existingItem.condition_notes
      ) {
        changes.push({
          field: 'conditionNotes',
          oldValue: existingItem.condition_notes || null,
          newValue: updateDto.conditionNotes,
        });
        existingItem.condition_notes = updateDto.conditionNotes;
      }

      if (updateDto.lastMaintenanceDate !== undefined) {
        const oldDate =
          existingItem.last_maintenance_date?.toISOString() || null;
        const newDate = updateDto.lastMaintenanceDate?.toISOString() || null;
        if (oldDate !== newDate) {
          changes.push({
            field: 'lastMaintenanceDate',
            oldValue: oldDate,
            newValue: newDate,
          });
          existingItem.last_maintenance_date = updateDto.lastMaintenanceDate;
        }
      }

      if (updateDto.nextMaintenanceDueDate !== undefined) {
        // Validate maintenance date logic
        if (
          updateDto.nextMaintenanceDueDate &&
          updateDto.lastMaintenanceDate &&
          updateDto.nextMaintenanceDueDate <= updateDto.lastMaintenanceDate
        ) {
          throw new BadRequestException({
            code: MessageKeys.MAINTENANCE_DATE_LOGIC_ERROR,
          });
        }

        const oldDate =
          existingItem.next_maintenance_due_date?.toISOString() || null;
        const newDate = updateDto.nextMaintenanceDueDate?.toISOString() || null;
        if (oldDate !== newDate) {
          changes.push({
            field: 'nextMaintenanceDueDate',
            oldValue: oldDate,
            newValue: newDate,
          });
          existingItem.next_maintenance_due_date =
            updateDto.nextMaintenanceDueDate;
        }
      }

      // Update version for optimistic locking
      existingItem.version += 1;
      existingItem.updated_at = new Date();

      // Save changes
      await manager.save(InventoryItem, existingItem);

      // Create audit log
      await this.createAuditLog(
        tenantId,
        userId,
        AuditAction.INVENTORY_ITEM_UPDATED,
        itemId,
        `Updated serialized item: ${existingItem.name}`,
        {
          itemId,
          changes,
          serialNumberChanged,
          historicalLinkMaintained,
        },
        manager,
      );

      // Return the updated item
      const updatedItem = await this.getInventoryItem(tenantId, itemId);

      return {
        item: updatedItem,
        changes,
        serialNumberChanged,
        historicalLinkMaintained,
      };
    });
  }

  /**
   * Update quantity for non-serialized items (?)
   */
  async updateQuantity(
    tenantId: string,
    userId: string,
    itemId: string,
    updateDto: {
      quantity: number;
      quantityUnit?: string;
      changeReason?: string;
    },
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    itemId: string;
    previousQuantity: number;
    newQuantity: number;
    allocatedQuantity: number;
    availableQuantity: number;
    quantityUnit: string | null;
    changeReason: string | null;
    impact: {
      availabilityChange: number;
      significantReduction: boolean;
    };
  }> {
    return this.dataSource.transaction(async (manager) => {
      // Find the existing item
      const existingItem = await manager.findOne(InventoryItem, {
        where: { id: itemId, tenant_id: tenantId },
      });

      if (!existingItem) {
        throw new NotFoundException({
          code: MessageKeys.INVENTORY_ITEM_NOT_FOUND,
        });
      }

      // Validate it's a non-serialized item
      if (existingItem.item_type !== ItemType.NON_SERIALIZED) {
        throw new BadRequestException({
          code: MessageKeys.NOT_NON_SERIALIZED_ITEM,
        });
      }

      const previousQuantity = existingItem.quantity || 0;
      const allocatedQuantity = existingItem.allocated_quantity || 0;

      // Validate new quantity is not below allocated quantity
      if (updateDto.quantity < allocatedQuantity) {
        throw new BadRequestException({
          code: MessageKeys.QUANTITY_BELOW_ALLOCATED,
          details: {
            requestedQuantity: updateDto.quantity,
            allocatedQuantity,
          },
        });
      }

      // Calculate impact
      const availabilityChange =
        updateDto.quantity -
        allocatedQuantity -
        (previousQuantity - allocatedQuantity);
      const significantReduction =
        previousQuantity > 0 &&
        (previousQuantity - updateDto.quantity) / previousQuantity > 0.5;

      // Update quantity fields
      existingItem.quantity = updateDto.quantity;
      if (updateDto.quantityUnit !== undefined) {
        existingItem.quantity_unit = updateDto.quantityUnit;
      }

      // Update version for optimistic locking
      existingItem.version += 1;
      existingItem.updated_at = new Date();

      // Save changes
      await manager.save(InventoryItem, existingItem);

      // Create audit log
      await this.createAuditLog(
        tenantId,
        userId,
        AuditAction.INVENTORY_ITEM_QUANTITY_UPDATED,
        itemId,
        `Updated quantity for item: ${existingItem.name}`,
        {
          itemId,
          previousQuantity,
          newQuantity: updateDto.quantity,
          allocatedQuantity,
          availableQuantity: updateDto.quantity - allocatedQuantity,
          changeReason: updateDto.changeReason,
          impact: { availabilityChange, significantReduction },
        },
        manager,
      );

      return {
        itemId,
        previousQuantity,
        newQuantity: updateDto.quantity,
        allocatedQuantity,
        availableQuantity: updateDto.quantity - allocatedQuantity,
        quantityUnit: existingItem.quantity_unit || null,
        changeReason: updateDto.changeReason || null,
        impact: {
          availabilityChange,
          significantReduction,
        },
      };
    });
  }

  /**
   * Bulk edit multiple inventory items (?)
   */
  async bulkEditItems(
    tenantId: string,
    userId: string,
    itemIds: string[],
    operations: {
      categoryId?: string;
      appendMaintenanceNotes?: string;
      status?: InventoryItemStatus;
      availabilityStatus?: AvailabilityStatus;
    },
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    operationId: string;
    summary: {
      totalItems: number;
      successfulItems: number;
      failedItems: number;
      partiallySuccessful: number;
    };
    results: Array<{
      itemId: string;
      status: 'success' | 'failed' | 'partial';
      changes: {
        field: string;
        oldValue: string | null;
        newValue: string | null;
      }[];
      errors: { field: string; reason: string }[];
    }>;
  }> {
    const operationId = crypto.randomUUID();
    const results: Array<{
      itemId: string;
      status: 'success' | 'failed' | 'partial';
      changes: {
        field: string;
        oldValue: string | null;
        newValue: string | null;
      }[];
      errors: { field: string; reason: string }[];
    }> = [];

    let successfulItems = 0;
    let failedItems = 0;
    let partiallySuccessful = 0;

    // Process each item individually
    for (const itemId of itemIds) {
      try {
        const changes: {
          field: string;
          oldValue: string | null;
          newValue: string | null;
        }[] = [];
        const errors: { field: string; reason: string }[] = [];

        await this.dataSource.transaction(async (manager) => {
          const item = await manager.findOne(InventoryItem, {
            where: { id: itemId, tenant_id: tenantId },
            relations: ['category'],
          });

          if (!item) {
            errors.push({
              field: 'item',
              reason: this.i18nService.translate(
                MessageKeys.BULK_ITEM_NOT_FOUND,
              ).message,
            });
            return;
          }

          // Apply category change
          if (
            operations.categoryId &&
            operations.categoryId !== item.category_id
          ) {
            const category = await manager.findOne(Category, {
              where: { id: operations.categoryId, tenantId: tenantId },
            });

            if (category) {
              changes.push({
                field: 'category',
                oldValue: item.category?.name || null,
                newValue: category.name,
              });
              item.category_id = operations.categoryId;
            } else {
              errors.push({
                field: 'category',
                reason: this.i18nService.translate(
                  MessageKeys.BULK_CATEGORY_NOT_FOUND,
                ).message,
              });
            }
          }

          // Apply status change
          if (operations.status && operations.status !== item.status) {
            changes.push({
              field: 'status',
              oldValue: item.status,
              newValue: operations.status,
            });
            item.status = operations.status;
          }

          // Apply availability status change
          if (
            operations.availabilityStatus &&
            operations.availabilityStatus !== item.availability_status
          ) {
            changes.push({
              field: 'availabilityStatus',
              oldValue: item.availability_status,
              newValue: operations.availabilityStatus,
            });
            item.availability_status = operations.availabilityStatus;
          }

          // Append maintenance notes
          if (operations.appendMaintenanceNotes) {
            const oldNotes = item.condition_notes || '';
            const newNotes =
              oldNotes +
              (oldNotes ? '\n' : '') +
              operations.appendMaintenanceNotes;
            changes.push({
              field: 'conditionNotes',
              oldValue: oldNotes || null,
              newValue: newNotes,
            });
            item.condition_notes = newNotes;
          }

          // Update version and timestamp
          item.version += 1;
          item.updated_at = new Date();

          // Save if there are changes
          if (changes.length > 0) {
            await manager.save(InventoryItem, item);
          }
        });

        // Determine result status
        let status: 'success' | 'failed' | 'partial';
        if (errors.length === 0) {
          status = 'success';
          successfulItems++;
        } else if (changes.length === 0) {
          status = 'failed';
          failedItems++;
        } else {
          status = 'partial';
          partiallySuccessful++;
        }

        results.push({
          itemId,
          status,
          changes,
          errors,
        });
      } catch (error) {
        failedItems++;
        results.push({
          itemId,
          status: 'failed',
          changes: [],
          errors: [
            {
              field: 'general',
              reason:
                error.message ||
                this.i18nService.translate(MessageKeys.BULK_GENERAL_ERROR)
                  .message,
            },
          ],
        });
      }
    }

    // Create audit log for bulk operation
    await this.createAuditLog(
      tenantId,
      userId,
      AuditAction.INVENTORY_ITEMS_BULK_UPDATED,
      operationId,
      `Bulk edited ${itemIds.length} items`,
      {
        operationId,
        operations,
        summary: {
          totalItems: itemIds.length,
          successfulItems,
          failedItems,
          partiallySuccessful,
        },
        results,
      },
    );

    return {
      operationId,
      summary: {
        totalItems: itemIds.length,
        successfulItems,
        failedItems,
        partiallySuccessful,
      },
      results,
    };
  }
}
