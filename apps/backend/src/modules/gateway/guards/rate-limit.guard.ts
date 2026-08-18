import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { env } from '@config/env';
import { RedisService } from '@modules/redis/redis.service';
import type { GatewayRequest } from '../middleware/correlation-id.middleware';
import { RateLimitExceededException } from '@modules/common/errors/gateway-errors';
import { RATE_LIMIT_GROUP, type RateLimitGroupName } from '../decorators/rate-limit-group.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<GatewayRequest>();
    const group =
      this.reflector.getAllAndOverride<RateLimitGroupName>(RATE_LIMIT_GROUP, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'catalog';
    const { max, windowSeconds } =
      group === 'auth'
        ? { max: env.RATE_LIMIT_AUTH_MAX, windowSeconds: env.RATE_LIMIT_AUTH_WINDOW_SECONDS }
        : { max: env.RATE_LIMIT_CATALOG_MAX, windowSeconds: env.RATE_LIMIT_CATALOG_WINDOW_SECONDS };
    const actor = request.user ? `user:${request.user.id}` : `ip:${request.ip}`;
    const key = `rate-limit:${group}:${actor}`;
    const attempts = await this.redis.execute(() => this.redis.client.incr(key));
    if (attempts === 1)
      await this.redis.execute(() => this.redis.client.expire(key, windowSeconds));
    if (attempts > max) {
      const ttl = await this.redis.execute(() => this.redis.client.ttl(key));
      throw new RateLimitExceededException(ttl > 0 ? ttl : windowSeconds);
    }
    return true;
  }
}
