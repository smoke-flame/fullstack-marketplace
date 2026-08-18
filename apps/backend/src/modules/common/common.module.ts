import { Global, Module } from '@nestjs/common';
import { BaseHttpException } from './errors/base-http.exception';
import { UnauthorizedException } from './errors/gateway-errors';
import { RateLimitExceededException } from './errors/gateway-errors';
import { ServiceUnavailableException } from './errors/gateway-errors';
import { ValidationException } from './errors/validation-error';

@Global()
@Module({
  providers: [
    BaseHttpException,
    UnauthorizedException,
    RateLimitExceededException,
    ServiceUnavailableException,
    ValidationException,
  ],
  exports: [
    BaseHttpException,
    UnauthorizedException,
    RateLimitExceededException,
    ServiceUnavailableException,
    ValidationException,
  ],
})
export class CommonModule {}
