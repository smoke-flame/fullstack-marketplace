import { Global, Module } from '@nestjs/common';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';
import { BaseHttpException } from './errors/base-http.exception';
import { UnauthorizedException } from './errors/gateway-errors';
import { RateLimitExceededException } from './errors/gateway-errors';
import { ServiceUnavailableException } from './errors/gateway-errors';
import { ValidationException } from './errors/validation-error';
import { ZodValidationPipe } from './pipes/zod-validation.pipe';
import { EventPublisher } from '../rabbitmq/event-publisher';

@Global()
@Module({
  imports: [RabbitmqModule],
  providers: [
    ZodValidationPipe,
    BaseHttpException,
    UnauthorizedException,
    RateLimitExceededException,
    ServiceUnavailableException,
    ValidationException,
    EventPublisher,
  ],
  exports: [
    ZodValidationPipe,
    BaseHttpException,
    UnauthorizedException,
    RateLimitExceededException,
    ServiceUnavailableException,
    ValidationException,
    EventPublisher,
  ],
})
export class CommonModule {}
