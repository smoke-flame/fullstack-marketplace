import { Body, Controller, Get, Post, Req, UseGuards, UsePipes } from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { EventPublisher } from '@modules/rabbitmq/event-publisher';
import { UserCreatedEvent } from './events/user-created.event';
import { Public } from '@modules/common/decorators/public.decorator';
import { JwtGatewayGuard } from '@modules/gateway/guards/jwt-gateway.guard';
import { ZodValidationPipe } from '@modules/common/pipes/zod-validation.pipe';
import {
  loginUserRequestSchema,
  type LoginResponse,
  refreshTokenRequestSchema,
  registerUserRequestSchema,
  type RegisterUserResponse,
  type MeResponse,
  logoutRequestSchema,
  type LoginUserRequest,
  type RefreshTokenRequest,
} from "@marketplace/contracts/api/auth";
import type { GatewayRequest } from '@modules/gateway/middleware/correlation-id.middleware';
import { RateLimitGroup } from '@modules/gateway/decorators/rate-limit-group.decorator';

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
  @RateLimitGroup('auth')
  @UsePipes(new ZodValidationPipe(loginUserRequestSchema))
  async login(@Body() body: LoginBody): Promise<LoginResponse> {
    return this.authService.login(body.email, body.password);
  }

  @Public()
  @Post('register')
  @RateLimitGroup('auth')
  async register(@Body(new ZodValidationPipe(registerUserRequestSchema)) body: RegisterBody, @Req() request: GatewayRequest): Promise<RegisterUserResponse> {
    const result = await this.authService.register(body.email, body.password, body.roles);
    const event = new UserCreatedEvent(
      { userId: result.userId, email: body.email, roles: body.roles },
      request.correlationId,
    );
    await this.publisher.publish(event);
    return result;
  }

  @Post('refresh')
  @RateLimitGroup('auth')
  @UsePipes(new ZodValidationPipe(refreshTokenRequestSchema))
  async refresh(@Body() body: RefreshBody): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  @RateLimitGroup('auth')
  async logout(@Body() body: LogoutBody): Promise<void> {
    await this.authService.logout(body.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtGatewayGuard)
  async me(@Req() request: GatewayRequest): Promise<MeResponse> {
    return this.authService.me(request.user!.id);
  }
}
