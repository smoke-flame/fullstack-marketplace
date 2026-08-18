import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { env } from './config/env';
import { validationExceptionFactory } from './modules/common/errors/validation-error';
import { RabbitMQEventType, RabbitMQCommandType, createRmqOptions } from './modules/rabbitmq/rabbitmq.constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableShutdownHooks();
  app.enableCors({
    origin: ['http://localhost:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  app.useLogger(new Logger());
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQEventType.USER_CREATED, false));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQEventType.PRODUCT_CREATED, false));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQEventType.PRODUCT_UPDATED, false));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQEventType.PRODUCT_ARCHIVED, false));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQEventType.ORDER_COMPLETED, false));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQEventType.ORDER_CANCELLED, false));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQEventType.ORDER_CREATED, false));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQEventType.INVENTORY_RESERVED, false));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQEventType.INVENTORY_REJECTED, false));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQEventType.PAYMENT_SUCCEEDED, false));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQEventType.PAYMENT_FAILED, false));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQEventType.NOTIFICATION_SENT, false));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQEventType.PAYMENT_REFUNDED, false));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQCommandType.INVENTORY_RESERVE, false));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQCommandType.INVENTORY_RELEASE, false));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQCommandType.PAYMENT_CHARGE, false));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQCommandType.PAYMENT_REFUND, false));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQCommandType.NOTIFICATION_SEND, false));
  await app.startAllMicroservices();
  await app.listen(env.PORT, '0.0.0.0');
  Logger.log(`Gateway listening on http://localhost:${env.PORT}`, 'Bootstrap');
}
bootstrap().catch((error: unknown) => {
  Logger.error('Startup failed', error instanceof Error ? error.stack : String(error), 'Bootstrap');
  process.exit(1);
});
