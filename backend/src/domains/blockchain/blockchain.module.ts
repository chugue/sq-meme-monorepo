import { Module } from '@nestjs/common';
import { BlockchainRepository } from './blockchain.repository';
import { BlockchainService } from './blockchain.service';

@Module({
    providers: [BlockchainService, BlockchainRepository],
    exports: [BlockchainService],
})
export class BlockchainModule {}
