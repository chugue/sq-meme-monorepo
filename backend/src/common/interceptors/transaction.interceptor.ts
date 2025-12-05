import {
    CallHandler,
    ExecutionContext,
    Inject,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, PoolClient } from 'pg';
import { Observable, from, lastValueFrom } from 'rxjs';
import { PG_POOL } from '../db/db.module';
import * as schema from '../db/schema';
import {
    IsolationLevel,
    TRANSACTIONAL_KEY,
    TransactionalOptions,
} from '../decorators/transactional.decorator';

// AsyncLocalStorage를 사용하여 요청별 트랜잭션 컨텍스트 관리
import { AsyncLocalStorage } from 'async_hooks';

export type TransactionClient = NodePgDatabase<typeof schema>;

interface TransactionContext {
    tx: TransactionClient;
    client: PoolClient;
}

// 전역 AsyncLocalStorage 인스턴스
export const transactionStorage = new AsyncLocalStorage<TransactionContext>();

/**
 * 현재 트랜잭션 컨텍스트에서 트랜잭션 클라이언트 가져오기
 * 트랜잭션 컨텍스트가 없으면 null 반환
 */
export function getTransactionClient(): TransactionClient | null {
    const context = transactionStorage.getStore();
    return context?.tx ?? null;
}

/**
 * @Transactional() 데코레이터가 적용된 메서드에 트랜잭션을 자동으로 적용하는 인터셉터
 */
@Injectable()
export class TransactionInterceptor implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        @Inject(PG_POOL)
        private readonly pool: Pool,
    ) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Promise<Observable<any>> {
        const options = this.reflector.get<TransactionalOptions>(
            TRANSACTIONAL_KEY,
            context.getHandler(),
        );

        // @Transactional() 데코레이터가 없으면 그냥 통과
        if (!options) {
            return next.handle();
        }

        const client: PoolClient = await this.pool.connect();

        try {
            // 격리 수준에 따른 BEGIN 쿼리 생성
            const beginQuery = this.buildBeginQuery(
                options.isolationLevel ?? 'READ_COMMITTED',
                options.readOnly ?? false,
            );
            await client.query(beginQuery);

            const tx = drizzle(client, { schema }) as TransactionClient;

            // AsyncLocalStorage를 사용하여 트랜잭션 컨텍스트 설정
            const result = await transactionStorage.run({ tx, client }, () => {
                return lastValueFrom(next.handle());
            });

            await client.query('COMMIT');
            return from([result]);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    private buildBeginQuery(
        isolationLevel: IsolationLevel,
        readOnly: boolean,
    ): string {
        let query = 'BEGIN TRANSACTION';

        switch (isolationLevel) {
            case 'REPEATABLE_READ':
                query += ' ISOLATION LEVEL REPEATABLE READ';
                break;
            case 'SERIALIZABLE':
                query += ' ISOLATION LEVEL SERIALIZABLE';
                break;
            default:
                query += ' ISOLATION LEVEL READ COMMITTED';
        }

        if (readOnly) {
            query += ' READ ONLY';
        }

        return query;
    }
}
