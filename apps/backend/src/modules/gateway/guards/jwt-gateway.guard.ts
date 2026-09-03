import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { uuidV4Schema } from '@marketplace/contracts/common/id';
import { userRoleSchema } from '@marketplace/contracts/models/user';
import { IS_PUBLIC } from '@modules/common/decorators/public.decorator';
import { IS_INTERNAL } from '@modules/common/decorators/internal.decorator';
import { UnauthorizedException } from '@modules/common/errors/gateway-errors';
import { env } from '@config/env';
import type { GatewayRequest } from '../middleware/correlation-id.middleware';

interface JwtClaims {
  sub: string;
  roles: unknown;
}

@Injectable()
export class JwtGatewayGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<GatewayRequest>();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    const isInternal = this.reflector.getAllAndOverride<boolean>(IS_INTERNAL, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isInternal) {
      const key = request.header('x-internal-key');
      if (!key || key !== env.INTERNAL_API_KEY) {
        throw new UnauthorizedException();
      }
      return true;
    }
    const header = request.header('authorization');
    if (!header && isPublic) return true;
    const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new UnauthorizedException();
    try {
      const payload = await this.jwt.verifyAsync<JwtClaims>(token);
      const roles = userRoleSchema.array().parse(payload.roles);
      request.user = { id: uuidV4Schema.parse(payload.sub), roles };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
