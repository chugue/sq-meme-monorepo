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
                    // Supabase Transaction mode pooler 호환 설정
                    max: 5, // 최대 연결 수 제한 (Supabase 무료 티어 고려)
                    min: 0, // 유휴 시 연결 유지 안함
                    idleTimeoutMillis: 10000, // 10초 유휴 타임아웃 (빠르게 반환)
                    connectionTimeoutMillis: 10000, // 10초 연결 타임아웃
                    allowExitOnIdle: true, // 유휴 시 연결 종료 허용
                });

                // Pool 에러 핸들러 등록 (unhandled error 방지)
                pool.on('error', (err) => {
                    logger.warn(
                        `⚠️ PostgreSQL Pool 연결 끊김 (자동 재연결됨): ${err.message}`,
                    );
                    // Supabase pooler가 유휴 연결을 종료하는 것은 정상 동작
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
