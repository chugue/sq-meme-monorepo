import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlockchainModule } from './domains/blockchain/blockchain.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '../.env'],
        }),
        BlockchainModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
