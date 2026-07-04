import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { ROLES_KEY } from './auth.decorators.js';
import type { AuthUser, UserRole } from './auth.types.js';
export interface AuthenticatedRequest extends Request { user: AuthUser }
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService, private readonly reflector: Reflector) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Token de acceso requerido');
    request.user = await this.auth.verifyAccessToken(header.slice(7));
    const accepted = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (accepted && !accepted.includes(request.user.role)) throw new ForbiddenException('Rol no autorizado');
    return true;
  }
}
