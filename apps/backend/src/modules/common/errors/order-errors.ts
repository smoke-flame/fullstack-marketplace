import { HttpStatus } from '@nestjs/common';
import { orderErrorCodes } from '@marketplace/contracts/errors/order';
import { BaseHttpException } from './base-http.exception';

export class OrderNotFoundException extends BaseHttpException {
  constructor() {
    super(orderErrorCodes.notFound, 'Order not found', HttpStatus.NOT_FOUND);
  }
}

export class OrderNotCancellableException extends BaseHttpException {
  constructor() {
    super(orderErrorCodes.notCancellable, 'Order not cancellable', HttpStatus.BAD_REQUEST);
  }
}

export class OrderInvalidTransitionException extends BaseHttpException {
  constructor() {
    super(orderErrorCodes.invalidTransition, 'Invalid order state transition', HttpStatus.CONFLICT);
  }
}

export class OrderSagaTimeoutException extends BaseHttpException {
  constructor() {
    super(orderErrorCodes.sagaTimeout, 'Order processing timed out', HttpStatus.GATEWAY_TIMEOUT);
  }
}
