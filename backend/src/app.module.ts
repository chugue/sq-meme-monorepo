import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlockchainModule } from './domains/blockchain/blockchain.module';

import { DbModule } from './common/db/db.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '../.env'],
        }),
        DbModule,
        BlockchainModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
