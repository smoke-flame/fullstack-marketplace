import { HttpStatus } from '@nestjs/common';
import { inventoryErrorCodes } from '@marketplace/contracts/errors/inventory';
import { BaseHttpException } from './base-http.exception';

export class StockBelowReservedException extends BaseHttpException {
  constructor() {
    super(inventoryErrorCodes.stockBelowReserved, 'Stock cannot be set below reserved quantity', HttpStatus.BAD_REQUEST);
  }
}

export class InsufficientStockException extends BaseHttpException {
  constructor() {
    super(inventoryErrorCodes.insufficientStock, 'Insufficient stock', HttpStatus.BAD_REQUEST);
  }
}
