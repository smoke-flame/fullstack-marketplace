import { PipeTransform, Injectable } from '@nestjs/common';
import { ZodSchema } from 'zod';
import { GatewayValidationException } from '../errors/validation-error';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        code: issue.code,
        message: issue.message,
      }));
      throw new GatewayValidationException(details);
    }
    return result.data;
  }
}
