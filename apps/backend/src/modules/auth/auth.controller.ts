import { Body, Controller, Post, UnauthorizedException, UsePipes } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../gateway/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ZodValidationPipe } from '../gateway/pipes/zod-validation.pipe';
import { loginUserRequestSchema, registerUserRequestSchema, authResponseSchema } from '@marketplace/contracts/api/auth/login';
import { refreshTokenRequestSchema } from '@marketplace/contracts/api/auth/refresh';
import type { LoginUserRequest, RegisterUserRequest, AuthResponse } from '@marketplace/contracts/api/auth/login';
import type { RefreshTokenRequest } from '@marketplace/contracts/api/auth/refresh';

type LoginBody = LoginUserRequest;
type RegisterBody = RegisterUserRequest;
type RefreshBody = RefreshTokenRequest;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('login')
  @UsePipes(new ZodValidationPipe(loginUserRequestSchema))
  async login(@Body() body: LoginBody): Promise<AuthResponse> {
    const userRecord = await this.prisma.user.findUnique({ where: { email: body.email } });
    if (!userRecord) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const passwordHash = Buffer.from(body.password).toString('base64');
    if (userRecord.password !== passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const accessToken = this.authService.issueAccessToken({ id: userRecord.id, roles: userRecord.roles });
    const refreshToken = this.authService.issueRefreshToken({ id: userRecord.id, roles: userRecord.roles });
    return authResponseSchema.parse({
      accessToken,
      refreshToken,
      user: { id: userRecord.id, email: userRecord.email, roles: userRecord.roles },
    });
  }

  @Public()
  @Post('register')
  @UsePipes(new ZodValidationPipe(registerUserRequestSchema))
  async register(@Body() body: RegisterBody): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      throw new UnauthorizedException('Email already registered');
    }
    const passwordHash = Buffer.from(body.password).toString('base64');
    const userRecord = await this.prisma.user.create({
      data: { email: body.email, password: passwordHash, roles: body.roles },
    });
    const accessToken = this.authService.issueAccessToken({ id: userRecord.id, roles: userRecord.roles });
    const refreshToken = this.authService.issueRefreshToken({ id: userRecord.id, roles: userRecord.roles });
    return authResponseSchema.parse({
      accessToken,
      refreshToken,
      user: { id: userRecord.id, email: userRecord.email, roles: userRecord.roles },
    });
  }

  @Public()
  @Post('refresh')
  @UsePipes(new ZodValidationPipe(refreshTokenRequestSchema))
  async refresh(@Body() body: RefreshBody): Promise<{ accessToken: string; refreshToken: string }> {
    const result = await this.authService.validateRefreshToken(body.refreshToken);
    if (!result) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const accessToken = this.authService.issueAccessToken({ id: result.id, roles: result.roles });
    return { accessToken, refreshToken: result.refreshToken };
  }
}
