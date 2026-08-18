import { HttpStatus } from '@nestjs/common';
import { cartErrorCodes } from '@marketplace/contracts/errors/cart';
import { BaseHttpException } from './base-http.exception';

export class CartLimitExceededException extends BaseHttpException {
  constructor() {
    super(cartErrorCodes.limitExceeded, 'Cart limit exceeded', HttpStatus.BAD_REQUEST);
  }
}

export class CartProductUnavailableException extends BaseHttpException {
  constructor() {
    super(cartErrorCodes.productUnavailable, 'Product unavailable', HttpStatus.BAD_REQUEST);
  }
}
