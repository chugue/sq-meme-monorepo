import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_CLIENT = 'SUPABASE_CLIENT';

@Global()
@Module({
    providers: [
        {
            provide: SUPABASE_CLIENT,
            inject: [ConfigService],
            useFactory: (configService: ConfigService): SupabaseClient => {
                const logger = new Logger('SupabaseModule');

                const supabaseUrl = configService.get<string>('SUPABASE_URL');
                const supabaseServiceKey = configService.get<string>(
                    'SUPABASE_SERVICE_ROLE_KEY',
                );

                if (!supabaseUrl || !supabaseServiceKey) {
                    logger.error(
                        '❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.',
                    );
                    throw new Error('Supabase configuration is missing');
                }

                logger.log('🔌 Supabase 클라이언트 초기화 중...');

                const client = createClient(supabaseUrl, supabaseServiceKey, {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false,
                    },
                });

                logger.log('✅ Supabase 클라이언트 초기화 완료!');

                return client;
            },
        },
    ],
    exports: [SUPABASE_CLIENT],
})
export class SupabaseModule {}
