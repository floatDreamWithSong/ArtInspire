import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException, Logger } from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform {
  private logger = new Logger(ZodValidationPipe.name)
  constructor(private schema: ZodSchema<T>) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transform(value: any, metadata: ArgumentMetadata) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      this.logger.error(result.error.message);
      throw new BadRequestException('Zod Validation failed');
    }
    return result.data;
  }
}
