import { Module } from '@nestjs/common';
import { GameRepository } from './game.repository';

@Module({
    providers: [GameRepository],
    exports: [GameRepository],
})
export class GameModule {}
