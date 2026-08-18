import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '@modules/redis/redis.service';
import { USER_REPOSITORY, UserRepository } from '@modules/users/user.repository';
import { userRoleSchema, type UserRole } from '@marketplace/contracts/models/user';
import {
  EmailTakenException,
  InvalidCredentialsException,
  RefreshTokenInvalidException,
  RefreshTokenRevokedException,
} from '@modules/common/errors/gateway-errors';
import { env } from '@config/env';

interface UserCredentials {
  id: string;
  roles: UserRole[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.users.findByEmail(normalizedEmail);
    if (!user) {
      throw new InvalidCredentialsException();
    }
    const passwordHash = Buffer.from(password).toString('base64');
    if (user.password !== passwordHash) {
      throw new InvalidCredentialsException();
    }
    return this.issueTokens({ id: user.id, roles: user.roles });
  }

  async register(email: string, password: string, roles: UserRole[]): Promise<{ userId: string }> {
    const normalizedEmail = this.normalizeEmail(email);
    const existing = await this.users.findByEmail(normalizedEmail);
    if (existing) {
      throw new EmailTakenException();
    }
    if (password.length < 8) {
      throw new InvalidCredentialsException();
    }
    const passwordHash = Buffer.from(password).toString('base64');
    const user = await this.users.create({ email: normalizedEmail, password: passwordHash, roles });
    return { userId: user.id };
  }

  async validateRefreshToken(token: string): Promise<{ id: string; roles: UserRole[]; refreshToken: string }> {
    let payload: { sub: string; roles: unknown; jti: string };
    try {
      payload = await this.jwt.verifyAsync(token, { secret: env.JWT_REFRESH_SECRET }) as { sub: string; roles: unknown; jti: string };
    } catch {
      throw new RefreshTokenInvalidException();
    }
    const key = this.refreshKey(payload.jti);
    const stored = await this.redis.client.get(key);
    if (!stored) {
      await this.revokeAllUserTokens(payload.sub);
      throw new RefreshTokenRevokedException();
    }
    const parsed = JSON.parse(stored) as { userId: string };
    const roles = userRoleSchema.array().parse(payload.roles as unknown as UserRole[]);
    await this.revokeToken(payload.jti, parsed.userId);
    const { refreshToken } = this.issueTokens({ id: parsed.userId, roles });
    return { id: parsed.userId, roles, refreshToken };
  }

  async refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    const result = await this.validateRefreshToken(token);
    const accessToken = this.signAccessToken({ id: result.id, roles: result.roles });
    return { accessToken, refreshToken: result.refreshToken };
  }

  async logout(token: string): Promise<void> {
    try {
      const payload = await this.jwt.verifyAsync(token, { secret: env.JWT_REFRESH_SECRET }) as { jti: string; sub: string };
      await this.revokeToken(payload.jti, payload.sub);
    } catch {
      // ignore invalid token
    }
  }

  async me(userId: string): Promise<{ id: string; email: string; roles: UserRole[]; createdAt: Date }> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new InvalidCredentialsException();
    }
    return {
      id: user.id,
      email: user.email,
      roles: user.roles,
      createdAt: user.createdAt,
    };
  }

  issueTokens(user: UserCredentials): { accessToken: string; refreshToken: string } {
    const accessToken = this.signAccessToken(user);
    const roles = userRoleSchema.array().parse(user.roles);
    const jti = `rt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const refreshToken = this.jwt.sign(
      { sub: user.id, roles, jti },
      { secret: env.JWT_REFRESH_SECRET, expiresIn: env.JWT_REFRESH_EXPIRES_IN as never },
    );
    const ttl = this.parseDuration(env.JWT_REFRESH_EXPIRES_IN);
    const key = this.refreshKey(jti);
    const userKey = this.userKey(user.id);
    const multi = this.redis.client.multi();
    multi.set(key, JSON.stringify({ userId: user.id }), 'EX', Math.floor(ttl / 1000));
    multi.sadd(userKey, jti);
    multi.expire(userKey, Math.floor(ttl / 1000));
    void multi.exec();
    return { accessToken, refreshToken };
  }

  private signAccessToken(user: UserCredentials): string {
    const roles = userRoleSchema.array().parse(user.roles);
    return this.jwt.sign(
      { sub: user.id, roles },
      { secret: env.JWT_ACCESS_SECRET, expiresIn: env.JWT_ACCESS_EXPIRES_IN as never },
    );
  }

  private refreshKey(jti: string): string {
    return `refresh_token:${jti}`;
  }

  private userKey(userId: string): string {
    return `user_refresh_tokens:${userId}`;
  }

  private async revokeToken(jti: string, userId: string): Promise<void> {
    const multi = this.redis.client.multi();
    multi.del(this.refreshKey(jti));
    multi.srem(this.userKey(userId), jti);
    void multi.exec();
  }

  private async revokeAllUserTokens(userId: string): Promise<void> {
    const userKey = this.userKey(userId);
    const jtis = await this.redis.client.smembers(userKey);
    if (jtis.length === 0) return;
    await this.redis.client.del(jtis.map((jti) => this.refreshKey(jti)));
    await this.redis.client.del(userKey);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private parseDuration(duration: string): number {
    const units: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    let total = 0;
    const regex = /(\d+)([smhd])/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(duration)) !== null) {
      total += Number(match[1]) * units[match[2]];
    }
    return total || 7 * 86_400_000;
  }
}
