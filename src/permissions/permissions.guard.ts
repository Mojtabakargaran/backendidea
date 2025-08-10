import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from './permissions.service';
import { MessageKeys } from '../common/message-keys';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>('permission', context.getHandler());
    if (!requiredPermission) return true;
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user || !user.id || !user.tenantId) {
      throw new ForbiddenException({
        code: MessageKeys.CATEGORY_PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }

    // Fetch user permissions dynamically
    const userPermissions = await this.permissionsService.getUserPermissions(
      user.id,
      user.tenantId,
    );

    if (!userPermissions.includes(requiredPermission)) {
      throw new ForbiddenException({
        code: MessageKeys.CATEGORY_PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }
    
    return true;
  }
}
