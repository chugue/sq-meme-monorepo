import { Module } from '@nestjs/common';
import { CommentModule } from '../comment/comment.module';
import { WinnersModule } from '../winners/winners.module';
import { GameController } from './game.controller';
import { GameRepository } from './game.repository';
import { GameService } from './game.service';

@Module({
    imports: [WinnersModule, CommentModule],
    controllers: [GameController],
    providers: [GameRepository, GameService],
    exports: [GameRepository, GameService],
})
export class GameModule {}
