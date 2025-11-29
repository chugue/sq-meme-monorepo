import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DrizzleAsyncProvider = 'drizzleProvider';

@Global()
@Module({
    providers: [
        {
            provide: DrizzleAsyncProvider,
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => {
                const connectionString =
                    configService.get<string>('DATABASE_URL');
                const pool = new Pool({
                    connectionString,
                });
                return drizzle(pool, { schema });
            },
        },
    ],
    exports: [DrizzleAsyncProvider],
})
export class DbModule {}
