import { HttpStatus } from '@nestjs/common';
import { reviewErrorCodes } from '@marketplace/contracts/errors/review';
import { BaseHttpException } from './base-http.exception';

export class ReviewAlreadyExistsException extends BaseHttpException {
  constructor() {
    super(reviewErrorCodes.reviewAlreadyExists, 'You have already reviewed this product', HttpStatus.CONFLICT);
  }
}

export class ReviewNotFoundException extends BaseHttpException {
  constructor() {
    super(reviewErrorCodes.reviewNotFound, 'Review not found', HttpStatus.NOT_FOUND);
  }
}

export class ReviewForbiddenException extends BaseHttpException {
  constructor() {
    super(reviewErrorCodes.reviewForbidden, 'Not authorized to delete this review', HttpStatus.FORBIDDEN);
  }
}

export class PurchaseNotFoundException extends BaseHttpException {
  constructor() {
    super(reviewErrorCodes.purchaseNotFound, 'You must purchase this product before reviewing', HttpStatus.FORBIDDEN);
  }
}
