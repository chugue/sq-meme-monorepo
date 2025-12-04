import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DrizzleAsyncProvider = 'drizzleProvider';
export const PG_POOL = 'PG_POOL';

@Global()
@Module({
    providers: [
        {
            provide: PG_POOL,
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => {
                const logger = new Logger('DbModule');
                const connectionString =
                    configService.get<string>('DATABASE_URL');

                logger.log('🔌 PostgreSQL 데이터베이스 연결 중...');

                const pool = new Pool({
                    connectionString,
                });

                // 연결 테스트
                try {
                    const client = await pool.connect();
                    client.release();
                    logger.log('✅ PostgreSQL 데이터베이스 연결 성공!');
                } catch (error) {
                    logger.error(
                        `❌ PostgreSQL 데이터베이스 연결 실패: ${error.message}`,
                    );
                    throw error;
                }

                return pool;
            },
        },
        {
            provide: DrizzleAsyncProvider,
            inject: [PG_POOL],
            useFactory: (pool: Pool) => {
                return drizzle(pool, { schema });
            },
        },
    ],
    exports: [DrizzleAsyncProvider, PG_POOL],
})
export class DbModule {}
