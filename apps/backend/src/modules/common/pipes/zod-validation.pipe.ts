import { PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';
import { ValidationException } from '../errors/validation-error';

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
      throw new ValidationException(details);
    }
    return result.data;
  }
}
