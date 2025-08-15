import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Not, In } from 'typeorm';
import { Category } from '../../entities/category.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { InventoryItem } from '../../entities/inventory-item.entity';
import { CreateCategoryRequestDto } from '../dto/create-category-request.dto';
import { CreateCategoryResponseDto } from '../dto/create-category-response.dto';
import { ListCategoriesQueryDto } from '../dto/list-categories-query.dto';
import {
  ListCategoriesResponseDto,
  CategoryListItemDto,
  PaginationDto,
} from '../dto/list-categories-response.dto';
import { UpdateCategoryRequestDto } from '../dto/update-category-request.dto';
import { UpdateCategoryResponseDto } from '../dto/update-category-response.dto';
import { DeleteCategoryResponseDto } from '../dto/delete-category-response.dto';
import { CategoryItemsCountResponseDto } from '../dto/category-items-count-response.dto';
import { MessageKeys } from '../../common/message-keys';
import {
  AuditAction,
  AuditStatus,
  InventoryItemStatus,
} from '../../common/enums';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(InventoryItem)
    private readonly inventoryItemRepository: Repository<InventoryItem>,
  ) {}

  async createCategory(
    tenantId: string,
    dto: CreateCategoryRequestDto,
    actorUserId: string,
  ): Promise<CreateCategoryResponseDto> {
    // Check for duplicate name within tenant
    const exists = await this.categoryRepository.findOne({
      where: { tenantId, name: dto.name.trim() },
    });
    if (exists) {
      throw new ConflictException({
        code: MessageKeys.CATEGORY_NAME_EXISTS,
        message: 'Category name already exists',
      });
    }
    const category = this.categoryRepository.create({
      tenantId,
      name: dto.name.trim(),
      description:
        dto.description !== undefined && dto.description !== null
          ? dto.description.trim()
          : undefined,
    });
    const saved = await this.categoryRepository.save(category);
    return {
      id: saved.id,
      name: saved.name,
      description: saved.description,
      createdAt: saved.createdAt.toISOString(),
      updatedAt: saved.updatedAt.toISOString(),
    };
  }

  async listCategories(
    tenantId: string,
    query: ListCategoriesQueryDto,
  ): Promise<ListCategoriesResponseDto> {
    const { page = 1, limit = 20, search } = query;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions: any = { tenantId };
    if (search && search.trim()) {
      whereConditions.name = Like(`%${search.trim()}%`);
    }

    // Get total count and categories
    const [categories, total] = await this.categoryRepository.findAndCount({
      where: whereConditions,
      order: { name: 'ASC' },
      skip: offset,
      take: limit,
    });

    // Map categories to DTOs with actual item counts
    const categoryDtos: CategoryListItemDto[] = await Promise.all(
      categories.map(async (category) => {
        const itemsCount = await this.getItemsCountForCategory(
          category.id,
          tenantId,
        );
        return {
          id: category.id,
          name: category.name,
          description: category.description || null,
          itemsCount,
          createdAt: category.createdAt.toISOString(),
          updatedAt: category.updatedAt.toISOString(),
        };
      }),
    );

    const totalPages = Math.ceil(total / limit);

    const pagination: PaginationDto = {
      page,
      limit,
      total,
      totalPages,
    };

    return {
      categories: categoryDtos,
      pagination,
    };
  }

  async updateCategory(
    tenantId: string,
    categoryId: string,
    dto: UpdateCategoryRequestDto,
    actorUserId: string,
  ): Promise<UpdateCategoryResponseDto> {
    // Find the category
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId, tenantId },
    });

    if (!category) {
      throw new NotFoundException({
        code: MessageKeys.CATEGORY_NOT_FOUND,
        message: 'Category not found',
      });
    }

    // Check for duplicate name if name is being changed
    if (dto.name.trim() !== category.name) {
      const exists = await this.categoryRepository.findOne({
        where: {
          tenantId,
          name: dto.name.trim(),
        },
      });
      if (exists && exists.id !== categoryId) {
        throw new ConflictException({
          code: MessageKeys.CATEGORY_NAME_EXISTS,
          message: 'Category name already exists',
        });
      }
    }

    // Update category
    category.name = dto.name.trim();
    category.description =
      dto.description !== undefined && dto.description !== null
        ? dto.description.trim()
        : undefined;

    const updated = await this.categoryRepository.save(category);

    const itemsCount = await this.getItemsCountForCategory(
      updated.id,
      tenantId,
    );

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description || null,
      itemsCount,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Helper method to get count of inventory items for a category
   */
  private async getItemsCountForCategory(
    categoryId: string,
    tenantId: string,
  ): Promise<number> {
    return await this.inventoryItemRepository.count({
      where: {
        category_id: categoryId,
        tenant_id: tenantId,
        status: Not(In([InventoryItemStatus.ARCHIVED])), // Don't count archived items
      },
    });
  }

  async deleteCategory(
    tenantId: string,
    categoryId: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    // Find the category
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId, tenantId },
    });

    if (!category) {
      throw new NotFoundException({
        code: MessageKeys.CATEGORY_NOT_FOUND,
        message: 'Category not found',
      });
    }

    // Check if category has associated inventory items
    const itemsCount = await this.inventoryItemRepository.count({
      where: {
        category_id: categoryId,
        tenant_id: tenantId,
        status: Not(In([InventoryItemStatus.ARCHIVED])), // Don't count archived items
      },
    });

    if (itemsCount > 0) {
      // Log the failed deletion attempt
      await this.auditLogRepository.save({
        tenantId,
        actorUserId,
        action: AuditAction.CATEGORY_DELETED,
        status: AuditStatus.FAILED,
        details: JSON.stringify({
          categoryName: category.name,
          description: category.description,
          hadAssociatedItems: true,
          associatedItemsCount: itemsCount,
        }),
        failureReason: 'Category has associated inventory items',
        ipAddress,
        userAgent,
      });

      throw new BadRequestException({
        code: MessageKeys.CATEGORY_HAS_ASSOCIATED_ITEMS,
        message: 'Cannot delete category with associated inventory items',
      });
    }

    try {
      // Delete the category
      await this.categoryRepository.remove(category);

      // Log successful deletion
      await this.auditLogRepository.save({
        tenantId,
        actorUserId,
        action: AuditAction.CATEGORY_DELETED,
        status: AuditStatus.SUCCESS,
        details: JSON.stringify({
          categoryName: category.name,
          description: category.description,
          hadAssociatedItems: itemsCount > 0,
          associatedItemsCount: itemsCount,
        }),
        ipAddress,
        userAgent,
      });
    } catch (error) {
      // Log failed deletion
      await this.auditLogRepository.save({
        tenantId,
        actorUserId,
        action: AuditAction.CATEGORY_DELETED,
        status: AuditStatus.FAILED,
        details: JSON.stringify({
          categoryName: category.name,
          description: category.description,
          hadAssociatedItems: itemsCount > 0,
          associatedItemsCount: itemsCount,
        }),
        failureReason: error.message || 'Unknown deletion error',
        ipAddress,
        userAgent,
      });

      throw new BadRequestException({
        code: MessageKeys.CATEGORY_DELETE_FAILED,
        message: 'Failed to delete category',
      });
    }
  }

  async getCategoryItemsCount(
    tenantId: string,
    categoryId: string,
  ): Promise<{ categoryId: string; itemsCount: number; canDelete: boolean }> {
    // Verify category exists and belongs to tenant
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId, tenantId },
    });

    if (!category) {
      throw new NotFoundException({
        code: MessageKeys.CATEGORY_NOT_FOUND,
        message: 'Category not found',
      });
    }

    // Get actual inventory items count
    const itemsCount = await this.inventoryItemRepository.count({
      where: {
        category_id: categoryId,
        tenant_id: tenantId,
        status: Not(In([InventoryItemStatus.ARCHIVED])), // Don't count archived items
      },
    });
    const canDelete = itemsCount === 0;

    return {
      categoryId,
      itemsCount,
      canDelete,
    };
  }
}
