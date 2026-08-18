import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { uuidV4Schema } from '@marketplace/contracts/common/id';
import type { UserRole } from '@marketplace/contracts/models/user';
import type { NextFunction, Request, Response } from 'express';

export interface GatewayRequest extends Request {
  correlationId: string;
  user?: GatewayUser;
}
export interface GatewayUser {
  id: string;
  roles: UserRole[];
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CorrelationIdMiddleware.name);

  use(request: GatewayRequest, response: Response, next: NextFunction) {
    const value = request.header('x-correlation-id')?.trim();
    request.correlationId = value && uuidV4Schema.safeParse(value).success ? value : randomUUID();
    response.setHeader('x-correlation-id', request.correlationId);
    this.logger.log(`HTTP request started: ${JSON.stringify({
      correlationId: request.correlationId,
      method: request.method,
      path: request.originalUrl,
    })}`);
    response.on('finish', () => {
      this.logger.log(`HTTP request completed: ${JSON.stringify({
        correlationId: request.correlationId,
        method: request.method,
        path: request.originalUrl,
        statusCode: response.statusCode,
      })}`);
    });
    next();
  }
}
