import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '@modules/auth/auth.service';
import { RedisService } from '@modules/redis/redis.service';
import { PrismaUserRepository } from '@modules/users/user.repository.prisma';
import { USER_REPOSITORY } from '@modules/users/user.repository';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { PrismaService } from '@modules/prisma/prisma.service';
import { RefreshTokenRevokedException } from '@modules/common/errors/gateway-errors';
import { v4 as uuidv4 } from 'uuid';

jest.mock('@config/env', () => ({
  env: {
    JWT_REFRESH_SECRET: 'refresh_secret',
    JWT_REFRESH_EXPIRES_IN: '7d',
    JWT_ACCESS_SECRET: 'access_secret',
    JWT_ACCESS_EXPIRES_IN: '15m',
    NODE_ENV: 'test',
  },
}));

describe('Auth refresh token rotation (Jest)', () => {
  let moduleRef: TestingModule;
  let authService: AuthService;
  let prisma: PrismaService;

  const redisStore = new Map<string, string>();
  const userTokens = new Map<string, Set<string>>();
  const tokenJtiMap = new Map<string, string>();

  const mockRedisClient = {
    get: async (key: string) => redisStore.get(key) ?? null,
    set: async (key: string, value: string) => { redisStore.set(key, value); },
    del: async (...keys: string[]) => { for (const key of keys) redisStore.delete(key); },
    sadd: async (key: string, ...members: string[]) => {
      const set = userTokens.get(key) || new Set<string>();
      members.forEach((m) => set.add(m));
      userTokens.set(key, set);
    },
    srem: async (key: string, ...members: string[]) => {
      const set = userTokens.get(key);
      if (set) {
        members.forEach((m) => set.delete(m));
        if (set.size === 0) userTokens.delete(key);
      }
    },
    smembers: async (key: string) => Array.from(userTokens.get(key) || []),
    multi: () => {
      const commands: Array<{ cmd: string; args: unknown[] }> = [];
      const api = {
        set: (key: string, value: string) => { commands.push({ cmd: 'set', args: [key, value] }); return api; },
        del: (...keys: string[]) => { commands.push({ cmd: 'del', args: keys }); return api; },
        sadd: (key: string, ...members: string[]) => { commands.push({ cmd: 'sadd', args: [key, ...members] }); return api; },
        srem: (key: string, ...members: string[]) => { commands.push({ cmd: 'srem', args: [key, ...members] }); return api; },
        expire: (key: string, ttl: number) => { commands.push({ cmd: 'expire', args: [key, ttl] }); return api; },
        exec: async () => {
          for (const { cmd, args } of commands) {
            switch (cmd) {
              case 'set': await mockRedisClient.set(args[0] as string, args[1] as string); break;
              case 'del': await mockRedisClient.del(...(args as string[])); break;
              case 'sadd': await mockRedisClient.sadd(args[0] as string, ...(args.slice(1) as string[])); break;
              case 'srem': await mockRedisClient.srem(args[0] as string, ...(args.slice(1) as string[])); break;
              case 'expire': break;
            }
          }
          return commands.map(() => null);
        },
      };
      return api;
    },
    quit: async () => {},
    connect: async () => {},
  };

  const mockRedisService = {
    client: mockRedisClient,
  } as unknown as RedisService;

  const mockJwtService = {
    sign: jest.fn((payload: any) => {
      const jti = payload.jti || `jti_${Date.now()}`;
      tokenJtiMap.set(jti, jti);
      return `refresh_${jti}`;
    }),
    verifyAsync: jest.fn(async (token: string) => {
      const prefix = 'refresh_';
      if (token.startsWith(prefix)) {
        const jti = token.slice(prefix.length);
        return { sub: 'user-id', roles: ['BUYER'], jti };
      }
      return { sub: 'user-id', roles: ['BUYER'] };
    }),
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: RedisService, useValue: mockRedisService },
        PrismaUserRepository,
        { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    redisStore.clear();
    userTokens.clear();
    tokenJtiMap.clear();
    mockJwtService.sign.mockClear();
    mockJwtService.verifyAsync.mockClear();

    await prisma.user.deleteMany({ where: { email: { contains: 'refresh-rotation@test.com' } } });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'refresh-rotation@test.com' } } });
  });

  it('rotates refresh token and invalidates old token on reuse', async () => {
    const email = `refresh-rotation-${Date.now()}@test.com`;
    const password = 'Password123!';
    const { hashPassword } = await import('@modules/auth/utils/password.util');

    await prisma.user.create({
      data: { id: uuidv4(), email, password: await hashPassword(password), roles: ['BUYER'] },
    });

    const loginResult = await authService.login(email, password);
    expect(loginResult.refreshToken).toBeDefined();

    const refreshToken = loginResult.refreshToken;

    const firstRefresh = await authService.refresh(refreshToken);
    expect(firstRefresh.refreshToken).toBeDefined();
    expect(firstRefresh.refreshToken).not.toBe(refreshToken);

    await expect(authService.refresh(refreshToken)).rejects.toThrow(RefreshTokenRevokedException);
  }, 30000);
});
