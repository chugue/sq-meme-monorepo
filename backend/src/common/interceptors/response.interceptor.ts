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
            map((data) => {
                const ctx = context.switchToHttp();
                const response = ctx.getResponse();
                const request = ctx.getRequest();

                let statusCode = HttpStatus.OK;
                if (request.method === 'POST') statusCode = HttpStatus.CREATED;
                if (request.method === 'PUT') statusCode = HttpStatus.CREATED;
                if (request.method === 'PATCH') statusCode = HttpStatus.CREATED;
                if (request.method === 'DELETE') statusCode = HttpStatus.OK;

                response.status(statusCode);

                return Result.ok(data);
            }),
        );
    }
}
