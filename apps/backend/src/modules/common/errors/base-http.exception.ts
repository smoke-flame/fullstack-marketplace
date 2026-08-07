import { HttpException, HttpStatus } from '@nestjs/common';
import type { ValidationErrorDetail } from '@marketplace/contracts/errors/gateway';

export class BaseHttpException extends HttpException {
  constructor(
    public readonly code: string,
    public readonly displayMessage: string,
    status: HttpStatus,
    public readonly details?: ValidationErrorDetail[],
  ) {
    super({ code, message: displayMessage, details }, status);
  }
}
