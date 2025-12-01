import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { TransactionRepository } from './transaction.repository';

@Module({
    controllers: [TransactionController],
    providers: [TransactionRepository],
    exports: [TransactionRepository],
})
export class TransactionModule {}
