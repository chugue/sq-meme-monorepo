import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { TransactionController } from './transaction.controller';
import { TransactionRepository } from './transaction.repository';
import { TransactionService } from './transaction.service';

@Module({
    imports: [GameModule],
    controllers: [TransactionController],
    providers: [TransactionRepository, TransactionService],
    exports: [TransactionRepository],
})
export class TransactionModule {}
