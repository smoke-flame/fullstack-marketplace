import type { ValidationError } from 'class-validator';
import {
  gatewayErrorCodes,
  type ValidationErrorDetail,
} from '@marketplace/contracts/errors/gateway';
import { GatewayHttpException } from './gateway-http.exception';

function flatten(errors: ValidationError[], parent = ''): ValidationErrorDetail[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.entries(error.constraints ?? {}).map(([code, message]) => ({
      field,
      code,
      message,
    }));
    return [...own, ...flatten(error.children ?? [], field)];
  });
}

export class GatewayValidationException extends GatewayHttpException {
  constructor(details: ValidationErrorDetail[]) {
    super(gatewayErrorCodes.validationError, 'Validation failed', 400, details);
  }
}

export function validationExceptionFactory(errors: ValidationError[]) {
  return new GatewayValidationException(flatten(errors));
}
