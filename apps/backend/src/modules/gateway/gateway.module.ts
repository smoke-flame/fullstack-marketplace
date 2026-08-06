import { Global, Module } from '@nestjs/common';
import { JwtGatewayGuard } from './guards/jwt-gateway.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';

@Global()
@Module({
  providers: [JwtGatewayGuard, RateLimitGuard],
  exports: [JwtGatewayGuard, RateLimitGuard],
})
export class GatewayModule {}
