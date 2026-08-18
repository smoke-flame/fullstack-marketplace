import { Global, Module } from '@nestjs/common';
import { BaseHttpException } from './errors/base-http.exception';
import { UnauthorizedException } from './errors/gateway-errors';
import { RateLimitExceededException } from './errors/gateway-errors';
import { ServiceUnavailableException } from './errors/gateway-errors';
import { ValidationException } from './errors/validation-error';
import { EventIdempotencyService } from './event-idempotency.service';
import { PrismaModule } from '@modules/prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    BaseHttpException,
    UnauthorizedException,
    RateLimitExceededException,
    ServiceUnavailableException,
    ValidationException,
    EventIdempotencyService,
  ],
  exports: [
    BaseHttpException,
    UnauthorizedException,
    RateLimitExceededException,
    ServiceUnavailableException,
    ValidationException,
    EventIdempotencyService,
  ],
})
export class CommonModule {}
