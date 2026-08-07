import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RabbitmqModule } from './modules/rabbitmq/rabbitmq.module';
import { RedisModule } from './modules/redis/redis.module';
import { SagaModule } from './modules/saga/saga.module';
import { NotificationModule } from './modules/notification/notification.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { CorrelationIdMiddleware } from './modules/gateway/middleware/correlation-id.middleware';
import { GatewayExceptionFilter } from './modules/gateway/gateway-exception.filter';
import { JwtGatewayGuard } from './modules/gateway/guards/jwt-gateway.guard';
import { RateLimitGuard } from './modules/gateway/guards/rate-limit.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GatewayModule,
    PrismaModule,
    AuthModule,
    RabbitmqModule,
    RedisModule,
    SagaModule,
    NotificationModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GatewayExceptionFilter },
    { provide: APP_GUARD, useClass: JwtGatewayGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
