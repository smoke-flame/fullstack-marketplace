import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';
import { userRoleSchema, type UserRole } from '@marketplace/contracts/models/user';
import { env } from '../../config/env';

interface UserCredentials {
  id: string;
  roles: UserRole[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
  ) {}

  issueAccessToken(user: UserCredentials): string {
    const roles = userRoleSchema.array().parse(user.roles);
    return this.jwt.sign(
      { sub: user.id, roles },
      { secret: env.JWT_ACCESS_SECRET, expiresIn: env.JWT_ACCESS_EXPIRES_IN as never },
    );
  }

  issueRefreshToken(user: UserCredentials): string {
    const roles = userRoleSchema.array().parse(user.roles);
    const jti = `rt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const token = this.jwt.sign(
      { sub: user.id, roles, jti },
      { secret: env.JWT_REFRESH_SECRET, expiresIn: env.JWT_REFRESH_EXPIRES_IN as never },
    );
    const ttl = this.parseDuration(env.JWT_REFRESH_EXPIRES_IN);
    void this.redis.client.set(`refresh_token:${jti}`, JSON.stringify({ userId: user.id, roles }), 'EX', Math.floor(ttl / 1000));
    return token;
  }

  async validateRefreshToken(token: string): Promise<{ id: string; roles: UserRole[]; refreshToken: string } | null> {
    let payload: { sub: string; roles: unknown; jti: string };
    try {
      payload = await this.jwt.verifyAsync(token, { secret: env.JWT_REFRESH_SECRET }) as { sub: string; roles: unknown; jti: string };
    } catch {
      return null;
    }
    const key = `refresh_token:${payload.jti}`;
    const stored = await this.redis.client.get(key);
    if (!stored) {
      return null;
    }
    const parsed = JSON.parse(stored) as { userId: string; roles: string[] };
    const roles = userRoleSchema.array().parse(parsed.roles);
    await this.redis.client.del(key);
    const newRefreshToken = this.issueRefreshToken({ id: parsed.userId, roles });
    return { id: parsed.userId, roles, refreshToken: newRefreshToken };
  }

  async revokeRefreshToken(token: string): Promise<void> {
    try {
      const payload = await this.jwt.verifyAsync(token, { secret: env.JWT_REFRESH_SECRET }) as { jti: string };
      await this.redis.client.del(`refresh_token:${payload.jti}`);
    } catch {
      // ignore invalid token
    }
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    let cursor = '0';
    do {
      const result = await this.redis.client.scan(cursor, 'MATCH', 'refresh_token:*', 'COUNT', '1000');
      cursor = result[0];
      const keys = result[1];
      if (keys.length > 0) {
        const values = await this.redis.client.mget(keys);
        const keysToDelete = keys.filter((_, idx) => {
          const raw = values[idx];
          if (!raw) return false;
          try {
            const parsed = JSON.parse(raw) as { userId: string };
            return parsed.userId === userId;
          } catch {
            return false;
          }
        });
        if (keysToDelete.length > 0) {
          await this.redis.client.del(keysToDelete);
        }
      }
    } while (cursor !== '0');
  }

  private parseDuration(duration: string): number {
    const units: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 86_400_000;
    return Number(match[1]) * units[match[2]];
  }
}
