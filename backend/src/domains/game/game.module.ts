import { Module } from '@nestjs/common';
import { CommentModule } from '../comment/comment.module';
import { FundersRepository } from '../funders/funders.repository';
import { TokenModule } from '../token/token.module';
import { WinnersModule } from '../winners/winners.module';
import { GameController } from './game.controller';
import { GameRepository } from './game.repository';
import { GameService } from './game.service';

@Module({
    imports: [WinnersModule, CommentModule, TokenModule],
    controllers: [GameController],
    providers: [GameRepository, GameService, FundersRepository],
    exports: [GameRepository, GameService],
})
export class GameModule {}
