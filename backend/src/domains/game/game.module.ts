import { Module } from '@nestjs/common';
import { GameRepository } from './game.repository';
import { GameService } from './game.service';

@Module({
    providers: [GameRepository, GameService],
    exports: [GameRepository, GameService],
})
export class GameModule {}
