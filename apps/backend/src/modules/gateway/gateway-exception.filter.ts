import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { gatewayErrorCodes, type ApiError } from '@marketplace/contracts/errors/gateway';
import type { Response } from 'express';
import type { GatewayRequest } from './middleware/correlation-id.middleware';
import { BaseHttpException } from '@modules/common/errors/base-http.exception';

@Catch()
export class GatewayExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GatewayExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<GatewayRequest>();
    const response = http.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    if (status >= 500)
      this.logger.error(
        `Gateway failure [${request.correlationId}]`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    const body: ApiError =
      exception instanceof BaseHttpException
        ? {
            code: exception.code,
            message: exception.displayMessage,
            ...(exception.details?.length ? { details: exception.details } : {}),
            correlationId: request.correlationId,
          }
        : {
            code: this.codeFor(status),
            message: this.messageFor(status),
            correlationId: request.correlationId,
          };
    response.status(status).json(body);
  }

  private codeFor(status: number) {
    if (status === HttpStatus.UNAUTHORIZED) return gatewayErrorCodes.unauthorized;
    if (status === HttpStatus.FORBIDDEN) return gatewayErrorCodes.forbidden;
    if (status === HttpStatus.NOT_FOUND) return gatewayErrorCodes.notFound;
    if (status === HttpStatus.BAD_REQUEST) return gatewayErrorCodes.badRequest;
    if (status === HttpStatus.TOO_MANY_REQUESTS) return gatewayErrorCodes.rateLimitExceeded;
    if (status === HttpStatus.SERVICE_UNAVAILABLE) return gatewayErrorCodes.serviceUnavailable;
    return gatewayErrorCodes.internalError;
  }

  private messageFor(status: number) {
    if (status === HttpStatus.SERVICE_UNAVAILABLE) return 'Service unavailable';
    if (status >= 500) return 'Internal server error';
    if (status === HttpStatus.NOT_FOUND) return 'Resource not found';
    if (status === HttpStatus.FORBIDDEN) return 'Forbidden';
    if (status === HttpStatus.UNAUTHORIZED) return 'Unauthorized';
    return 'Request failed';
  }
}
