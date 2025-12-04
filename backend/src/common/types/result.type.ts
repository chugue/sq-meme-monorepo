import { HttpStatus } from '@nestjs/common';

export type Result<T> =
    | { success: true; data: T }
    | { success: false; errorMessage: string; statusCode: HttpStatus };

export const Result = {
    ok: <T>(data: T): Result<T> => ({ success: true, data }),
    fail: <T>(
        errorMessage: string,
        statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    ): Result<T> => ({
        success: false,
        errorMessage,
        statusCode,
    }),
};
