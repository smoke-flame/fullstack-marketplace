import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { env } from './config/env';
import { validationExceptionFactory } from './modules/common/errors/validation-error';
import { RabbitMQEventType, RabbitMQCommandType, createRmqOptions } from './modules/rabbitmq/rabbitmq.constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
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
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQEventType.USER_CREATED));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQEventType.PRODUCT_CREATED));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQEventType.PRODUCT_UPDATED));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQEventType.PRODUCT_ARCHIVED));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQEventType.ORDER_CREATED));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQEventType.ORDER_COMPLETED));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQEventType.ORDER_CANCELLED));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQCommandType.INVENTORY_RESERVE));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQCommandType.INVENTORY_RELEASE));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQCommandType.PAYMENT_CHARGE));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQCommandType.PAYMENT_REFUND));
  app.connectMicroservice<MicroserviceOptions>(createRmqOptions(RabbitMQCommandType.NOTIFICATION_SEND));
  await app.startAllMicroservices();
  await app.listen(env.PORT, '0.0.0.0');
  Logger.log(`Gateway listening on http://localhost:${env.PORT}`, 'Bootstrap');
}
bootstrap().catch((error: unknown) => {
  Logger.error('Startup failed', error instanceof Error ? error.stack : String(error), 'Bootstrap');
  process.exit(1);
});
