import { Inject, Injectable, Logger } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, PoolClient } from 'pg';
import { PG_POOL } from 'src/common/db/db.module';
import * as schema from 'src/common/db/schema';

export type TransactionClient = NodePgDatabase<typeof schema>;

/**
 * Drizzle 트랜잭션 관리 서비스
 *
 * @example
 * // 서비스에서 사용
 * await this.transactionService.run(async (tx) => {
 *     await tx.insert(users).values({ name: 'John' });
 *     await tx.insert(posts).values({ title: 'Hello', userId: 1 });
 * });
 */
@Injectable()
export class TransactionService {
    private readonly logger = new Logger(TransactionService.name);

    constructor(
        @Inject(PG_POOL)
        private readonly pool: Pool,
    ) {}

    /**
     * 트랜잭션 내에서 콜백 실행
     * @param callback 트랜잭션 클라이언트를 받아 실행할 콜백
     * @returns 콜백의 반환값
     */
    async run<T>(
        callback: (tx: TransactionClient) => Promise<T>,
    ): Promise<T> {
        const client: PoolClient = await this.pool.connect();

        try {
            await client.query('BEGIN');

            const tx = drizzle(client, { schema }) as TransactionClient;
            const result = await callback(tx);

            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            this.logger.error(`트랜잭션 롤백: ${error.message}`);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * 읽기 전용 트랜잭션 (REPEATABLE READ 격리 수준)
     */
    async runReadOnly<T>(
        callback: (tx: TransactionClient) => Promise<T>,
    ): Promise<T> {
        const client: PoolClient = await this.pool.connect();

        try {
            await client.query(
                'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY',
            );

            const tx = drizzle(client, { schema }) as TransactionClient;
            const result = await callback(tx);

            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            this.logger.error(`읽기 트랜잭션 롤백: ${error.message}`);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * SERIALIZABLE 격리 수준 트랜잭션 (가장 엄격)
     */
    async runSerializable<T>(
        callback: (tx: TransactionClient) => Promise<T>,
    ): Promise<T> {
        const client: PoolClient = await this.pool.connect();

        try {
            await client.query(
                'BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE',
            );

            const tx = drizzle(client, { schema }) as TransactionClient;
            const result = await callback(tx);

            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            this.logger.error(`Serializable 트랜잭션 롤백: ${error.message}`);
            throw error;
        } finally {
            client.release();
        }
    }
}
