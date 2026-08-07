import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { env } from './config/env';
import { validationExceptionFactory } from './modules/common/errors/validation-error';
import { RabbitMQEventType, createRmqOptions } from './modules/rabbitmq/rabbitmq.constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
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
  await app.startAllMicroservices();
  await app.listen(env.PORT, '0.0.0.0');
  Logger.log(`Gateway listening on http://localhost:${env.PORT}`, 'Bootstrap');
}
bootstrap().catch((error: unknown) => {
  Logger.error('Startup failed', error instanceof Error ? error.stack : String(error), 'Bootstrap');
  process.exit(1);
});
