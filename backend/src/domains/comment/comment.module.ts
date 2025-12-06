import { Module } from '@nestjs/common';
import { QuestRepository } from '../quests/quest.repository';
import { UsersRepository } from '../users/users.repository';
import { CommentController } from './comment.controller';
import { CommentRepository } from './comment.repository';
import { CommentService } from './comment.service';

@Module({
    controllers: [CommentController],
    providers: [
        CommentService,
        CommentRepository,
        UsersRepository,
        QuestRepository,
    ],
    exports: [CommentRepository, CommentService],
})
export class CommentModule {}
