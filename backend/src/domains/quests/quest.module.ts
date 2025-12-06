import { Module } from '@nestjs/common';
import { QuestController } from './quest.controller';
import { QuestService } from './quest.service';
import { QuestRepository } from './quest.repository';

@Module({
    controllers: [QuestController],
    providers: [QuestService, QuestRepository],
    exports: [QuestRepository, QuestService],
})
export class QuestModule {}
