import { Global, Module } from '@nestjs/common';
import { JwtGatewayGuard } from './guards/jwt-gateway.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { GatewayExceptionFilter } from './gateway-exception.filter';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';
import { CommonModule } from '@modules/common/common.module';

@Global()
@Module({
  imports: [CommonModule],
  providers: [JwtGatewayGuard, RateLimitGuard, GatewayExceptionFilter, CorrelationIdMiddleware],
  exports: [JwtGatewayGuard, RateLimitGuard, GatewayExceptionFilter, CorrelationIdMiddleware, CommonModule],
})
export class GatewayModule {}
