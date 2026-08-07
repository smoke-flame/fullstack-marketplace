import { Body, Controller, Get, Post, Req, UsePipes } from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { EventPublisher } from '../rabbitmq/event-publisher';
import { UserCreatedEvent } from './events/user-created.event';
import { Public } from '../common/decorators/public.decorator';
import { UnauthorizedException } from '../common/errors/gateway-errors';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { loginUserRequestSchema, type LoginResponse } from '@marketplace/contracts/api/auth/login';
import { refreshTokenRequestSchema } from '@marketplace/contracts/api/auth/refresh';
import { registerUserRequestSchema, type RegisterUserResponse } from '@marketplace/contracts/api/auth/register';
import { type MeResponse } from '@marketplace/contracts/api/auth/me';
import { logoutRequestSchema } from '@marketplace/contracts/api/auth/logout';
import type { LoginUserRequest } from '@marketplace/contracts/api/auth/login';
import type { RefreshTokenRequest } from '@marketplace/contracts/api/auth/refresh';
import type { GatewayRequest } from '../gateway/middleware/correlation-id.middleware';

type LoginBody = LoginUserRequest;
type RegisterBody = z.infer<typeof registerUserRequestSchema>;
type RefreshBody = RefreshTokenRequest;
type LogoutBody = z.infer<typeof logoutRequestSchema>;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly publisher: EventPublisher,
  ) { }

  @Public()
  @Post('login')
  @UsePipes(new ZodValidationPipe(loginUserRequestSchema))
  async login(@Body() body: LoginBody): Promise<LoginResponse> {
    return this.authService.login(body.email, body.password);
  }

  @Public()
  @Post('register')
  @UsePipes(new ZodValidationPipe(registerUserRequestSchema))
  async register(@Body() body: RegisterBody, @Req() request: GatewayRequest): Promise<RegisterUserResponse> {
    const result = await this.authService.register(body.email, body.password, body.roles);
    const event = new UserCreatedEvent(
      { userId: result.userId, email: body.email, roles: body.roles },
      request.correlationId,
    );
    await this.publisher.publish(event);
    return result;
  }

  @Post('refresh')
  @UsePipes(new ZodValidationPipe(refreshTokenRequestSchema))
  async refresh(@Body() body: RefreshBody): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  @UsePipes(new ZodValidationPipe(logoutRequestSchema))
  async logout(@Body() body: LogoutBody): Promise<void> {
    await this.authService.logout(body.refreshToken);
  }

  @Get('me')
  async me(@Req() request: GatewayRequest): Promise<MeResponse> {
    if (!request.user) {
      throw new UnauthorizedException();
    }
    return this.authService.me(request.user.id);
  }
}
