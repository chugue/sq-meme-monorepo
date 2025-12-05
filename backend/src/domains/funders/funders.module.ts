import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { FundersController } from './funders.controller';
import { FundersRepository } from './funders.repository';
import { FundersService } from './funders.service';

@Module({
    imports: [GameModule],
    controllers: [FundersController],
    providers: [FundersRepository, FundersService],
    exports: [FundersRepository, FundersService],
})
export class FundersModule {}
