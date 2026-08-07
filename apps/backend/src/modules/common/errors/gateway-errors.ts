import { HttpStatus } from '@nestjs/common';
import { authErrorCodes, gatewayErrorCodes } from '@marketplace/contracts/errors/gateway';
import { BaseHttpException } from './base-http.exception';

export class UnauthorizedException extends BaseHttpException {
  constructor() {
    super(gatewayErrorCodes.unauthorized, 'Unauthorized', HttpStatus.UNAUTHORIZED);
  }
}

export class EmailTakenException extends BaseHttpException {
  constructor() {
    super(authErrorCodes.emailTaken, 'Email already taken', HttpStatus.BAD_REQUEST);
  }
}

export class PasswordTooWeakException extends BaseHttpException {
  constructor() {
    super(authErrorCodes.passwordTooWeak, 'Password is too weak', HttpStatus.BAD_REQUEST);
  }
}

export class InvalidCredentialsException extends BaseHttpException {
  constructor() {
    super(authErrorCodes.invalidCredentials, 'Invalid credentials', HttpStatus.UNAUTHORIZED);
  }
}

export class RefreshTokenInvalidException extends BaseHttpException {
  constructor() {
    super(authErrorCodes.refreshTokenInvalid, 'Refresh token is invalid', HttpStatus.UNAUTHORIZED);
  }
}

export class RefreshTokenRevokedException extends BaseHttpException {
  constructor() {
    super(authErrorCodes.refreshTokenRevoked, 'Refresh token has been revoked', HttpStatus.UNAUTHORIZED);
  }
}

export class RateLimitExceededException extends BaseHttpException {
  constructor() {
    super(gatewayErrorCodes.rateLimitExceeded, 'Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
  }
}

export class ServiceUnavailableException extends BaseHttpException {
  constructor() {
    super(
      gatewayErrorCodes.serviceUnavailable,
      'Service unavailable',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
