import { HttpStatus } from '@nestjs/common';
import { catalogErrorCodes } from '@marketplace/contracts/errors/catalog';
import { BaseHttpException } from './base-http.exception';

export class CategoryNotFoundException extends BaseHttpException {
  constructor() {
    super(catalogErrorCodes.categoryNotFound, 'Category not found', HttpStatus.NOT_FOUND);
  }
}

export class ProductNotFoundException extends BaseHttpException {
  constructor() {
    super(catalogErrorCodes.productNotFound, 'Product not found', HttpStatus.NOT_FOUND);
  }
}

export class CategoryDepthExceededException extends BaseHttpException {
  constructor() {
    super(catalogErrorCodes.categoryDepthExceeded, 'Category depth exceeded', HttpStatus.BAD_REQUEST);
  }
}

export class ProductForbiddenException extends BaseHttpException {
  constructor() {
    super(catalogErrorCodes.forbidden, 'Not owner', HttpStatus.FORBIDDEN);
  }
}
