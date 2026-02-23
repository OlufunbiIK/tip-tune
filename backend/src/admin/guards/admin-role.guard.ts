import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
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
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const adminRole = await this.adminRoleRepository.findOne({
      where: { userId: user.id },
    });

    if (!adminRole) {
      throw new ForbiddenException('User does not have admin privileges');
    }

    const hasPermission = requiredPermissions.every((permission) =>
      adminRole.permissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'Insufficient permissions to perform this action',
      );
    }

    request.adminRole = adminRole;
    return true;
  }
}
