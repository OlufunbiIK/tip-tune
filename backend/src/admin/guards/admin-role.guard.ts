import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminRole } from '../entities/admin-role.entity';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(AdminRole)
    private adminRoleRepository: Repository<AdminRole>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const logger = new Logger(AdminRoleGuard.name);
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as { userId?: string } | undefined;

    if (!user?.userId) {
      logger.warn('Denied admin access: unauthenticated or malformed principal');
      throw new UnauthorizedException('User not authenticated');
    }

    const adminRole = await this.adminRoleRepository.findOne({
      where: { userId: user.userId },
    });

    if (!adminRole) {
      logger.warn(
        `Denied admin access: no admin role for userId=${user.userId}`,
      );
      throw new ForbiddenException('User does not have admin privileges');
    }

    const hasPermission = requiredPermissions.every((permission) =>
      adminRole.permissions.includes(permission),
    );

    if (!hasPermission) {
      logger.warn(
        `Denied admin access: missing permissions for userId=${user.userId} required=${requiredPermissions.join(',')}`,
      );
      throw new ForbiddenException(
        'Insufficient permissions to perform this action',
      );
    }

    request.adminRole = adminRole;
    return true;
  }
}
