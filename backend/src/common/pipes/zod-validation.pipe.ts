import {
    ArgumentMetadata,
    BadRequestException,
    PipeTransform,
} from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
    constructor(private schema: ZodSchema) {}

    transform(value: unknown, metadata: ArgumentMetadata) {
        if (metadata.type !== 'body') {
            return value;
        }

        const result = this.schema.safeParse(value);

        if (!result.success) {
            const errors = result.error.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message,
            }));

            throw new BadRequestException({
                message: '입력값 검증에 실패했습니다',
                errors,
            });
        }

        return result.data;
    }
}
