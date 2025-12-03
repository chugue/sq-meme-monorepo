import { Module } from '@nestjs/common';
import { WinnersModule } from '../winners/winners.module';
import { GameController } from './game.controller';
import { GameRepository } from './game.repository';
import { GameService } from './game.service';

@Module({
    imports: [WinnersModule],
    controllers: [GameController],
    providers: [GameRepository, GameService],
    exports: [GameRepository, GameService],
})
export class GameModule {}
