import { HttpException, HttpStatus } from '@nestjs/common';
import type {
  GatewayErrorCode,
  ValidationErrorDetail,
} from '@marketplace/contracts/errors/gateway';

export class GatewayHttpException extends HttpException {
  constructor(
    public readonly code: GatewayErrorCode,
    public readonly displayMessage: string,
    status: HttpStatus,
    public readonly details?: ValidationErrorDetail[],
  ) {
    super({ code, message: displayMessage, details }, status);
  }
}
