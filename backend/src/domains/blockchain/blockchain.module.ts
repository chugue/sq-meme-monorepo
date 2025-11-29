import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { GameModule } from '../game/game.module';
import { CommentModule } from '../comment/comment.module';

@Module({
    imports: [GameModule, CommentModule],
    providers: [BlockchainService],
    exports: [BlockchainService],
})
export class BlockchainModule {}
