import { User } from '@/entities/user.entity';
import { Tenant } from '@/entities/tenant.entity';
import { RoleName } from '@/common/enums';

declare global {
  namespace Express {
    interface Request {
      user?: User & {
        roleName?: RoleName;
        permissions?: string[];
      };
      tenant?: Tenant;
      sessionId?: string;
    }
  }
}

export {};
