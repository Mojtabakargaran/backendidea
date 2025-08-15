import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpStatus,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { InventoryService } from './services/inventory.service';
import { CreateInventoryItemRequestDto } from './dto/create-inventory-item-request.dto';
import { CreateInventoryItemResponseDto } from './dto/create-inventory-item-response.dto';
import { UpdateInventoryItemRequestDto } from './dto/update-inventory-item-request.dto';
import { UpdateInventoryItemResponseDto } from './dto/update-inventory-item-response.dto';
import { ChangeInventoryItemStatusRequestDto } from './dto/change-inventory-item-status-request.dto';
import { ChangeInventoryItemStatusResponseDto } from './dto/change-inventory-item-status-response.dto';
import { GetStatusOptionsResponseDto } from './dto/get-status-options-response.dto';
import { GetStatusHistoryQueryDto } from './dto/get-status-history-query.dto';
import { GetStatusHistoryResponseDto } from './dto/get-status-history-response.dto';
import { ListInventoryItemsQueryDto } from './dto/list-inventory-items-query.dto';
import { ListInventoryItemsResponseDto } from './dto/list-inventory-items-response.dto';
import { GetInventoryItemResponseDto } from './dto/get-inventory-item-response.dto';
import { ValidateSerialNumberRequestDto } from './dto/validate-serial-number-request.dto';
import { ValidateSerialNumberResponseDto } from './dto/validate-serial-number-response.dto';
import { GenerateSerialNumberResponseDto } from './dto/generate-serial-number-response.dto';
import { ExportInventoryRequestDto } from './dto/export-inventory-request.dto';
import { ExportInventoryResponseDto } from './dto/export-inventory-response.dto';
import { UpdateSerializedItemRequestDto } from './dto/update-serialized-item-request.dto';
import { UpdateSerializedItemResponseDto } from './dto/update-serialized-item-response.dto';
import { UpdateQuantityRequestDto } from './dto/update-quantity-request.dto';
import { UpdateQuantityResponseDto } from './dto/update-quantity-response.dto';
import { BulkEditRequestDto } from './dto/bulk-edit-request.dto';
import {
  BulkEditSyncResponseDto,
  BulkEditAsyncResponseDto,
} from './dto/bulk-edit-response.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { Permission } from '../permissions/permission.decorator';
import { AuthenticatedUser } from '../auth/decorators/authenticated-user.decorator';
import { I18nService } from '../i18n/i18n.service';
import { MessageKeys } from '../common/message-keys';
import {
  ItemType,
  AvailabilityStatus,
  InventoryItemStatus,
} from '../common/enums';

@ApiTags('Inventory Management')
@Controller('inventory')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
@ApiHeader({
  name: 'accept-language',
  description: 'Language preference',
  required: true,
  enum: ['en', 'fa', 'ar'],
})
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly i18nService: I18nService,
  ) {}

  @Get()
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @Permission('inventory:read')
  @ApiOperation({
    summary: 'List inventory items',
    description:
      'Retrieve paginated list of inventory items with filtering and sorting options',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search in item name, description, or serial number',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: String,
    description: 'UUID format for category filtering',
  })
  @ApiQuery({
    name: 'itemType',
    required: false,
    enum: ItemType,
    description: 'Filter by item type',
  })
  @ApiQuery({
    name: 'availabilityStatus',
    required: false,
    enum: AvailabilityStatus,
    description: 'Filter by availability status',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: InventoryItemStatus,
    description: 'Filter by item status',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: [
      'name',
      'category',
      'itemType',
      'availabilityStatus',
      'createdAt',
      'updatedAt',
    ],
    description: 'Sort field (default: "createdAt")',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort direction (default: "desc")',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Inventory items retrieved successfully',
    type: ListInventoryItemsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Session expired or invalid',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async listInventoryItems(
    @AuthenticatedUser() user: any,
    @Query() queryDto: ListInventoryItemsQueryDto,
  ): Promise<ListInventoryItemsResponseDto> {
    const { items, meta } = await this.inventoryService.listInventoryItems(
      user.tenantId,
      queryDto,
      user.id,
    );

    return {
      code: MessageKeys.INVENTORY_LIST_RETRIEVED,
      message: (
        await this.i18nService.translate(
          MessageKeys.INVENTORY_LIST_RETRIEVED,
          user.language,
        )
      ).message,
      data: items,
      meta,
    };
  }

  @Post()
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @Permission('inventory:create')
  @ApiOperation({
    summary: 'Create inventory item',
    description: 'Create new serialized or non-serialized inventory item',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Inventory item created successfully',
    type: CreateInventoryItemResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error, duplicate name, or duplicate serial number',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Session expired or invalid',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async createInventoryItem(
    @AuthenticatedUser() user: any,
    @Body() createDto: CreateInventoryItemRequestDto,
  ): Promise<CreateInventoryItemResponseDto> {
    const inventoryItem = await this.inventoryService.createInventoryItem(
      user.tenantId,
      user.id,
      createDto,
    );

    return {
      code: MessageKeys.INVENTORY_ITEM_CREATED,
      message: (
        await this.i18nService.translate(
          MessageKeys.INVENTORY_ITEM_CREATED,
          user.language,
        )
      ).message,
      data: inventoryItem,
    };
  }

  @Get(':itemId')
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @Permission('inventory:read')
  @ApiOperation({
    summary: 'Get inventory item details',
    description: 'Retrieve detailed information about specific inventory item',
  })
  @ApiParam({
    name: 'itemId',
    description: 'UUID of inventory item',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Inventory item retrieved successfully',
    type: GetInventoryItemResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Session expired or invalid',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Item not found',
  })
  async getInventoryItem(
    @AuthenticatedUser() user: any,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<GetInventoryItemResponseDto> {
    const inventoryItem = await this.inventoryService.getInventoryItem(
      user.tenantId,
      itemId,
      user.id,
    );

    return {
      code: MessageKeys.INVENTORY_ITEM_RETRIEVED,
      message: (
        await this.i18nService.translate(
          MessageKeys.INVENTORY_ITEM_RETRIEVED,
          user.language,
        )
      ).message,
      data: inventoryItem,
    };
  }

  @Post('export')
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @Permission('inventory:export')
  @ApiOperation({
    summary: 'Export inventory items',
    description:
      'Export detailed information for one or more inventory items in various formats',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Export initiated successfully',
    type: ExportInventoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid export parameters or item selection',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Session expired or invalid',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient export permissions',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'One or more items not found',
  })
  async exportInventoryItems(
    @AuthenticatedUser() user: any,
    @Body() exportDto: ExportInventoryRequestDto,
    @Req() request: Request,
  ): Promise<ExportInventoryResponseDto> {
    const ipAddress =
      request.ip || request.connection.remoteAddress || 'unknown';
    const userAgent = request.headers['user-agent'];

    const exportResult = await this.inventoryService.initiateInventoryExport(
      user.tenantId,
      user.id,
      exportDto,
      ipAddress,
      userAgent,
    );

    return {
      code: MessageKeys.EXPORT_INITIATED,
      message: (
        await this.i18nService.translate(
          MessageKeys.EXPORT_INITIATED,
          user.language,
        )
      ).message,
      data: {
        exportId: exportResult.exportId,
        status: exportResult.status,
        recordCount: exportResult.recordCount,
        downloadUrl: exportResult.downloadUrl,
        expiresAt: exportResult.expiresAt.toISOString(),
        estimatedCompletionTime:
          exportResult.estimatedCompletionTime.toISOString(),
      },
    };
  }

  @Get('export/:exportId/download')
  @ApiOperation({
    summary: 'Download export file',
    description: 'Download the generated export file',
  })
  @ApiParam({
    name: 'exportId',
    description: 'Export ID from the export initiation response',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Export file downloaded successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Export not found or expired',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Session expired or invalid',
  })
  async downloadExport(
    @AuthenticatedUser() user: any,
    @Param('exportId', ParseUUIDPipe) exportId: string,
    @Res() response: Response,
  ) {
    const result = await this.inventoryService.downloadExport(
      user.tenantId,
      exportId,
    );

    // Set appropriate headers for file download
    response.setHeader('Content-Type', result.contentType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    response.setHeader(
      'Content-Length',
      Buffer.byteLength(result.content, 'utf8').toString(),
    );
    response.setHeader('Cache-Control', 'no-cache');

    // Send the content and end the response
    response.send(result.content);
    response.end();
  }

  @Post('serial-number/validate')
  @ApiOperation({
    summary: 'Validate serial number',
    description: 'Check if serial number is unique within tenant',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Serial number validation completed',
    type: ValidateSerialNumberResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Session expired or invalid',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async validateSerialNumber(
    @AuthenticatedUser() user: any,
    @Body() validateDto: ValidateSerialNumberRequestDto,
  ): Promise<ValidateSerialNumberResponseDto> {
    const validation = await this.inventoryService.validateSerialNumber(
      user.tenantId,
      validateDto.serialNumber,
    );

    return {
      code: MessageKeys.SERIAL_NUMBER_VALIDATION_RESULT,
      message: (
        await this.i18nService.translate(
          MessageKeys.SERIAL_NUMBER_VALIDATION_RESULT,
          user.language,
        )
      ).message,
      data: {
        isUnique: validation.isUnique,
        serialNumber: validateDto.serialNumber,
      },
    };
  }

  @Post('serial-number/generate')
  @ApiOperation({
    summary: 'Generate serial number',
    description: 'Generate next available serial number for tenant',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Serial number generated successfully',
    type: GenerateSerialNumberResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Session expired or invalid',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async generateSerialNumber(
    @AuthenticatedUser() user: any,
  ): Promise<GenerateSerialNumberResponseDto> {
    const serialNumber = await this.inventoryService.generateSerialNumber(
      user.tenantId,
    );

    return {
      code: MessageKeys.SERIAL_NUMBER_GENERATED,
      message: (
        await this.i18nService.translate(
          MessageKeys.SERIAL_NUMBER_GENERATED,
          user.language,
        )
      ).message,
      data: {
        serialNumber,
      },
    };
  }

  @Put(':id')
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @Permission('inventory:update')
  @ApiOperation({
    summary: 'Update inventory item',
    description: 'Update basic information of an existing inventory item (?)',
  })
  @ApiParam({
    name: 'id',
    description: 'Inventory item UUID',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Inventory item updated successfully',
    type: UpdateInventoryItemResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Session expired or invalid',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions for editing',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Item not found or belongs to different tenant',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Item was modified by another user or name already exists',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Item type cannot be changed due to rental history',
  })
  async updateInventoryItem(
    @AuthenticatedUser() user: any,
    @Param('id', ParseUUIDPipe) itemId: string,
    @Body() updateDto: UpdateInventoryItemRequestDto,
    @Req() req: Request,
  ): Promise<UpdateInventoryItemResponseDto> {
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    const result = await this.inventoryService.updateInventoryItem(
      user.tenantId,
      user.id,
      itemId,
      updateDto,
      ipAddress,
      userAgent,
    );

    return {
      code: MessageKeys.ITEM_UPDATED,
      message: (
        await this.i18nService.translate(
          MessageKeys.ITEM_UPDATED,
          user.language,
        )
      ).message,
      data: result,
    };
  }

  @Patch(':id/status')
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @Permission('inventory:update')
  @ApiOperation({
    summary: 'Change inventory item status',
    description: 'Update the operational status of an inventory item (?)',
  })
  @ApiParam({
    name: 'id',
    description: 'Inventory item UUID',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Item status changed successfully',
    type: ChangeInventoryItemStatusResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid status transition',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Session expired or invalid',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions for status change',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Item not found or belongs to different tenant',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Item currently allocated or locked by rental operations',
  })
  async changeInventoryItemStatus(
    @AuthenticatedUser() user: any,
    @Param('id', ParseUUIDPipe) itemId: string,
    @Body() statusDto: ChangeInventoryItemStatusRequestDto,
    @Req() req: Request,
  ): Promise<ChangeInventoryItemStatusResponseDto> {
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    const result = await this.inventoryService.changeInventoryItemStatus(
      user.tenantId,
      user.id,
      itemId,
      statusDto,
      ipAddress,
      userAgent,
    );

    return {
      code: MessageKeys.STATUS_CHANGED,
      message: (
        await this.i18nService.translate(
          MessageKeys.STATUS_CHANGED,
          user.language,
        )
      ).message,
      data: {
        itemId: result.itemId,
        previousStatus: result.previousStatus,
        newStatus: result.newStatus,
        changeReason: result.changeReason,
        expectedResolutionDate: result.expectedResolutionDate?.toISOString(),
        changeId: result.changeId,
        changedAt: result.changedAt.toISOString(),
      },
    };
  }

  @Get('status-options/:id')
  @ApiOperation({
    summary: 'Get valid status transition options',
    description:
      'Retrieve valid status transition options for dropdown population',
  })
  @ApiParam({
    name: 'id',
    description: 'Inventory item UUID',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Valid status options retrieved successfully',
    type: GetStatusOptionsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Session expired or invalid',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Item not found or belongs to different tenant',
  })
  async getStatusOptions(
    @AuthenticatedUser() user: any,
    @Param('id', ParseUUIDPipe) itemId: string,
  ): Promise<GetStatusOptionsResponseDto> {
    const result = await this.inventoryService.getStatusOptions(
      user.tenantId,
      itemId,
    );

    return {
      code: MessageKeys.STATUS_OPTIONS_RETRIEVED,
      message: (
        await this.i18nService.translate(
          MessageKeys.STATUS_OPTIONS_RETRIEVED,
          user.language,
        )
      ).message,
      data: result,
    };
  }

  @Get(':id/status-history')
  @ApiOperation({
    summary: 'Get status change history',
    description: 'Retrieve status change history for audit trail display',
  })
  @ApiParam({
    name: 'id',
    description: 'Inventory item UUID',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 50)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Status history retrieved successfully',
    type: GetStatusHistoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Session expired or invalid',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Item not found or belongs to different tenant',
  })
  async getStatusHistory(
    @AuthenticatedUser() user: any,
    @Param('id', ParseUUIDPipe) itemId: string,
    @Query() queryDto: GetStatusHistoryQueryDto,
  ): Promise<GetStatusHistoryResponseDto> {
    const result = await this.inventoryService.getStatusHistory(
      user.tenantId,
      itemId,
      queryDto,
    );

    return {
      code: MessageKeys.STATUS_HISTORY_RETRIEVED,
      message: (
        await this.i18nService.translate(
          MessageKeys.STATUS_HISTORY_RETRIEVED,
          user.language,
        )
      ).message,
      data: result,
    };
  }

  @Put(':itemId/serialized')
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @Permission('inventory:update')
  @ApiOperation({
    summary: 'Update Serialized Item Information',
    description:
      'Update specific fields for serialized inventory items including serial number, maintenance dates, and condition notes',
  })
  @ApiParam({
    name: 'itemId',
    description: 'UUID of the inventory item to update',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'Language preference',
    required: true,
    enum: ['en', 'fa', 'ar'],
    example: 'en',
  })
  @ApiResponse({
    status: 200,
    description: 'Serialized item updated successfully',
    type: UpdateSerializedItemResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation error, duplicate serial number, or invalid maintenance dates',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - session expired',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - insufficient permissions or elevated permissions required for serial number change',
  })
  @ApiResponse({
    status: 404,
    description:
      'Item not found, belongs to different tenant, or not a serialized item',
  })
  @ApiResponse({
    status: 409,
    description: 'Serial number already exists within tenant',
  })
  @ApiResponse({
    status: 422,
    description: 'Serial number change restricted due to rental history',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async updateSerializedItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() updateDto: UpdateSerializedItemRequestDto,
    @AuthenticatedUser() user: any,
    @Req() request: Request,
  ): Promise<UpdateSerializedItemResponseDto> {
    const result = await this.inventoryService.updateSerializedItem(
      user.tenantId,
      user.id,
      itemId,
      {
        serialNumber: updateDto.serialNumber,
        serialNumberSource: updateDto.serialNumberSource,
        conditionNotes: updateDto.conditionNotes,
        lastMaintenanceDate: updateDto.lastMaintenanceDate
          ? new Date(updateDto.lastMaintenanceDate)
          : undefined,
        nextMaintenanceDueDate: updateDto.nextMaintenanceDueDate
          ? new Date(updateDto.nextMaintenanceDueDate)
          : undefined,
        confirmSerialNumberChange: updateDto.confirmSerialNumberChange,
      },
      request.ip,
      request.get('User-Agent'),
    );

    return {
      code: MessageKeys.SERIALIZED_ITEM_UPDATED,
      message: (
        await this.i18nService.translate(
          MessageKeys.SERIALIZED_ITEM_UPDATED,
          user.language,
        )
      ).message,
      data: result,
    };
  }

  @Put(':itemId/quantity')
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @Permission('inventory:update')
  @ApiOperation({
    summary: 'Update Non-Serialized Item Quantity',
    description:
      'Update the total quantity of a non-serialized inventory item with validation and impact analysis',
  })
  @ApiParam({
    name: 'itemId',
    description: 'UUID of the inventory item to update',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'Language preference',
    required: true,
    enum: ['en', 'fa', 'ar'],
    example: 'en',
  })
  @ApiResponse({
    status: 200,
    description: 'Item quantity updated successfully',
    type: UpdateQuantityResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or quantity below allocated amount',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - session expired',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions for quantity updates',
  })
  @ApiResponse({
    status: 404,
    description:
      'Item not found, belongs to different tenant, or not a non-serialized item',
  })
  @ApiResponse({
    status: 409,
    description: 'Quantity conflict with current allocations',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async updateQuantity(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() updateDto: UpdateQuantityRequestDto,
    @AuthenticatedUser() user: any,
    @Req() request: Request,
  ): Promise<UpdateQuantityResponseDto> {
    const result = await this.inventoryService.updateQuantity(
      user.tenantId,
      user.id,
      itemId,
      updateDto,
      request.ip,
      request.get('User-Agent'),
    );

    return {
      code: MessageKeys.QUANTITY_UPDATED,
      message: (
        await this.i18nService.translate(
          MessageKeys.QUANTITY_UPDATED,
          user.language,
        )
      ).message,
      data: result,
    };
  }

  @Post('bulk-edit')
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @Permission('inventory:update')
  @ApiOperation({
    summary: 'Bulk Edit Multiple Inventory Items',
    description:
      'Simultaneously update common properties across multiple inventory items with detailed result reporting',
  })
  @ApiHeader({
    name: 'accept-language',
    description: 'Language preference',
    required: true,
    enum: ['en', 'fa', 'ar'],
    example: 'en',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk edit operation completed successfully',
    type: BulkEditSyncResponseDto,
  })
  @ApiResponse({
    status: 202,
    description: 'Large bulk edit operation initiated asynchronously',
    type: BulkEditAsyncResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation error, invalid item selection, or incompatible bulk operations',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - session expired',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - insufficient permissions for bulk edit operations',
  })
  @ApiResponse({
    status: 404,
    description:
      'One or more selected items not found or belong to different tenant',
  })
  @ApiResponse({
    status: 422,
    description: 'Some items cannot be bulk edited due to business rules',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async bulkEditItems(
    @Body() bulkEditDto: BulkEditRequestDto,
    @AuthenticatedUser() user: any,
    @Req() request: Request,
  ): Promise<BulkEditSyncResponseDto> {
    // Check if this is a large operation (>100 items)
    if (
      bulkEditDto.itemIds.length > 100 &&
      !bulkEditDto.confirmLargeOperation
    ) {
      throw new BadRequestException({
        code: MessageKeys.BULK_LARGE_OPERATION_WARNING,
        details: {
          itemCount: bulkEditDto.itemIds.length,
          requiresConfirmation: true,
        },
      });
    }

    const result = await this.inventoryService.bulkEditItems(
      user.tenantId,
      user.id,
      bulkEditDto.itemIds,
      bulkEditDto.operations,
      request.ip,
      request.get('User-Agent'),
    );

    return {
      code: MessageKeys.BULK_EDIT_COMPLETED,
      message: (
        await this.i18nService.translate(
          MessageKeys.BULK_EDIT_COMPLETED,
          user.language,
        )
      ).message,
      data: result,
    };
  }
}
