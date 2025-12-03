import { Module } from '@nestjs/common';
import { WinnersController } from './winners.controller';
import { WinnersRepository } from './winners.repository';
import { WinnersService } from './winners.service';

@Module({
    controllers: [WinnersController],
    providers: [WinnersRepository, WinnersService],
    exports: [WinnersRepository, WinnersService],
})
export class WinnersModule {}
