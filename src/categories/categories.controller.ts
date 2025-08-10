import {
  Body,
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { CategoriesService } from './services/categories.service';
import { CreateCategoryRequestDto } from './dto/create-category-request.dto';
import { CreateCategoryResponseDto } from './dto/create-category-response.dto';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto';
import { ListCategoriesResponseDto } from './dto/list-categories-response.dto';
import { UpdateCategoryRequestDto } from './dto/update-category-request.dto';
import { UpdateCategoryResponseDto } from './dto/update-category-response.dto';
import { DeleteCategoryResponseDto } from './dto/delete-category-response.dto';
import { CategoryItemsCountResponseDto } from './dto/category-items-count-response.dto';
import { MessageKeys } from '../common/message-keys';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { Permission } from '../permissions/permission.decorator';
import { I18nService } from '../i18n/i18n.service';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly i18nService: I18nService,
  ) {}

  @Post()
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @Permission('categories:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation errors or duplicate name' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing session' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async createCategory(
    @Headers('accept-language') acceptLanguage: string,
    @Req() req: any,
    @Body() body: CreateCategoryRequestDto,
    @Res() res: Response,
  ) {
    // Assume req.user.tenantId and req.user.id are set by auth guard
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      const unauthorizedMessage = await this.i18nService.translate(
        MessageKeys.SESSION_EXPIRED,
        acceptLanguage,
      );
      return res.status(HttpStatus.UNAUTHORIZED).json({
        code: MessageKeys.SESSION_EXPIRED,
        message: unauthorizedMessage.message,
      });
    }
    try {
      const data: CreateCategoryResponseDto = await this.categoriesService.createCategory(
        tenantId,
        body,
        userId,
      );
      const successMessage = await this.i18nService.translate(
        MessageKeys.CATEGORY_CREATED,
        acceptLanguage,
      );
      return res.status(HttpStatus.CREATED).json({
        code: MessageKeys.CATEGORY_CREATED,
        message: successMessage.message,
        data,
      });
    } catch (err) {
      if (err.status === HttpStatus.CONFLICT) {
        const conflictMessage = await this.i18nService.translate(
          MessageKeys.CATEGORY_NAME_EXISTS,
          acceptLanguage,
        );
        return res.status(HttpStatus.BAD_REQUEST).json({
          code: MessageKeys.CATEGORY_NAME_EXISTS,
          message: conflictMessage.message,
        });
      }
      if (err.status === HttpStatus.FORBIDDEN) {
        const forbiddenMessage = await this.i18nService.translate(
          MessageKeys.CATEGORY_PERMISSION_DENIED,
          acceptLanguage,
        );
        return res.status(HttpStatus.FORBIDDEN).json({
          code: MessageKeys.CATEGORY_PERMISSION_DENIED,
          message: forbiddenMessage.message,
        });
      }
      if (err.status === HttpStatus.BAD_REQUEST) {
        const invalidInputMessage = await this.i18nService.translate(
          MessageKeys.CATEGORY_INVALID_INPUT,
          acceptLanguage,
        );
        return res.status(HttpStatus.BAD_REQUEST).json({
          code: MessageKeys.CATEGORY_INVALID_INPUT,
          message: invalidInputMessage.message,
        });
      }
      const errorMessage = await this.i18nService.translate(
        MessageKeys.INTERNAL_SERVER_ERROR,
        acceptLanguage,
      );
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        code: MessageKeys.INTERNAL_SERVER_ERROR,
        message: errorMessage.message,
      });
    }
  }

  @Get()
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @Permission('categories:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List categories with pagination and search' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing session' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async listCategories(
    @Req() req: any,
    @Query() query: ListCategoriesQueryDto,
    @Res() res: Response,
  ) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        code: MessageKeys.SESSION_EXPIRED,
        message: 'Unauthorized',
      });
    }

    try {
      const data: ListCategoriesResponseDto = await this.categoriesService.listCategories(
        tenantId,
        query,
      );
      return res.status(HttpStatus.OK).json({
        code: MessageKeys.CATEGORIES_RETRIEVED,
        message: 'Categories retrieved successfully',
        data,
      });
    } catch (err) {
      if (err.status === HttpStatus.FORBIDDEN) {
        return res.status(HttpStatus.FORBIDDEN).json({
          code: MessageKeys.CATEGORY_PERMISSION_DENIED,
          message: 'Permission denied',
        });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        code: MessageKeys.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
    }
  }

  @Put(':categoryId')
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @Permission('categories:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an existing category' })
  @ApiParam({ name: 'categoryId', description: 'Category UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation errors or duplicate name' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing session' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async updateCategory(
    @Req() req: any,
    @Param('categoryId') categoryId: string,
    @Body() body: UpdateCategoryRequestDto,
    @Res() res: Response,
  ) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        code: MessageKeys.SESSION_EXPIRED,
        message: 'Unauthorized',
      });
    }

    try {
      const data: UpdateCategoryResponseDto = await this.categoriesService.updateCategory(
        tenantId,
        categoryId,
        body,
        userId,
      );
      return res.status(HttpStatus.OK).json({
        code: MessageKeys.CATEGORY_UPDATED,
        message: 'Category updated successfully',
        data,
      });
    } catch (err) {
      if (err.status === HttpStatus.NOT_FOUND) {
        return res.status(HttpStatus.NOT_FOUND).json({
          code: MessageKeys.CATEGORY_NOT_FOUND,
          message: 'Category not found',
        });
      }
      if (err.status === HttpStatus.CONFLICT) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          code: MessageKeys.CATEGORY_NAME_EXISTS,
          message: 'Category name already exists',
        });
      }
      if (err.status === HttpStatus.FORBIDDEN) {
        return res.status(HttpStatus.FORBIDDEN).json({
          code: MessageKeys.CATEGORY_PERMISSION_DENIED,
          message: 'Permission denied',
        });
      }
      if (err.status === HttpStatus.BAD_REQUEST) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          code: MessageKeys.CATEGORY_INVALID_INPUT,
          message: 'Invalid input',
        });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        code: MessageKeys.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
    }
  }

  @Delete(':categoryId')
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @Permission('categories:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a category' })
  @ApiParam({ name: 'categoryId', description: 'Category UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - category has associated items' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing session' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async deleteCategory(
    @Req() req: any,
    @Param('categoryId') categoryId: string,
    @Res() res: Response,
  ) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        code: MessageKeys.SESSION_EXPIRED,
        message: 'Unauthorized',
      });
    }

    // Extract client information for audit logging
    const ipAddress = req.ip || req.connection.remoteAddress || undefined;
    const userAgent = req.get('User-Agent') || undefined;

    try {
      await this.categoriesService.deleteCategory(
        tenantId,
        categoryId,
        userId,
        ipAddress,
        userAgent,
      );
      return res.status(HttpStatus.OK).json({
        code: MessageKeys.CATEGORY_DELETED,
        message: 'Category deleted successfully',
      });
    } catch (err) {
      if (err.status === HttpStatus.NOT_FOUND) {
        return res.status(HttpStatus.NOT_FOUND).json({
          code: MessageKeys.CATEGORY_NOT_FOUND,
          message: 'Category not found',
        });
      }
      if (err.status === HttpStatus.BAD_REQUEST) {
        // Check if it's because of associated items
        if (err.response?.code === MessageKeys.CATEGORY_HAS_ASSOCIATED_ITEMS) {
          return res.status(HttpStatus.BAD_REQUEST).json({
            code: MessageKeys.CATEGORY_HAS_ASSOCIATED_ITEMS,
            message: 'Cannot delete category with associated inventory items',
          });
        }
        return res.status(HttpStatus.BAD_REQUEST).json({
          code: MessageKeys.CATEGORY_DELETE_FAILED,
          message: 'Failed to delete category',
        });
      }
      if (err.status === HttpStatus.FORBIDDEN) {
        return res.status(HttpStatus.FORBIDDEN).json({
          code: MessageKeys.CATEGORY_PERMISSION_DENIED,
          message: 'Permission denied',
        });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        code: MessageKeys.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
    }
  }

  @Get(':categoryId/items-count')
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @Permission('categories:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get category items count for deletion validation' })
  @ApiParam({ name: 'categoryId', description: 'Category UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Items count retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing session' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getCategoryItemsCount(
    @Req() req: any,
    @Param('categoryId') categoryId: string,
    @Res() res: Response,
  ) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        code: MessageKeys.SESSION_EXPIRED,
        message: 'Unauthorized',
      });
    }

    try {
      const data = await this.categoriesService.getCategoryItemsCount(
        tenantId,
        categoryId,
      );
      return res.status(HttpStatus.OK).json({
        code: MessageKeys.ITEMS_COUNT_RETRIEVED,
        message: 'Items count retrieved successfully',
        data,
      });
    } catch (err) {
      if (err.status === HttpStatus.NOT_FOUND) {
        return res.status(HttpStatus.NOT_FOUND).json({
          code: MessageKeys.CATEGORY_NOT_FOUND,
          message: 'Category not found',
        });
      }
      if (err.status === HttpStatus.FORBIDDEN) {
        return res.status(HttpStatus.FORBIDDEN).json({
          code: MessageKeys.CATEGORY_PERMISSION_DENIED,
          message: 'Permission denied',
        });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        code: MessageKeys.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
    }
  }
}
