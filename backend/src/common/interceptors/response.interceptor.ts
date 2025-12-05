import {
    CallHandler,
    ExecutionContext,
    HttpStatus,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Result } from '../types/result.type';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor {
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<Result<T>> {
        return next.handle().pipe(
            map((data: Result<T>) => {
                const ctx = context.switchToHttp();
                const response = ctx.getResponse();
                const request = ctx.getRequest();

                // Result 객체가 아닌 경우 그대로 반환
                if (data === null || data === undefined || typeof data.success !== 'boolean') {
                    return data;
                }

                if (!data.success) {
                    // Result.fail인 경우 - statusCode 사용
                    response.status(data.statusCode);
                } else {
                    // Result.ok인 경우 - 메서드에 따른 상태코드
                    let statusCode = HttpStatus.OK;
                    if (request.method === 'POST')
                        statusCode = HttpStatus.CREATED;
                    if (request.method === 'PUT')
                        statusCode = HttpStatus.CREATED;
                    if (request.method === 'PATCH')
                        statusCode = HttpStatus.CREATED;

                    response.status(statusCode);
                }

                return data;
            }),
        );
    }
}
