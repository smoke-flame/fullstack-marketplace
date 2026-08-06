import { HttpStatus } from '@nestjs/common';
import { gatewayErrorCodes } from '@marketplace/contracts/errors/gateway';
import { GatewayHttpException } from './gateway-http.exception';

export class GatewayUnauthorizedException extends GatewayHttpException {
  constructor() {
    super(gatewayErrorCodes.unauthorized, 'Unauthorized', HttpStatus.UNAUTHORIZED);
  }
}

export class RateLimitExceededException extends GatewayHttpException {
  constructor() {
    super(gatewayErrorCodes.rateLimitExceeded, 'Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
  }
}

export class ServiceUnavailableException extends GatewayHttpException {
  constructor() {
    super(
      gatewayErrorCodes.serviceUnavailable,
      'Service unavailable',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
