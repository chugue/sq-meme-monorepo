import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { CommentModule } from '../comment/comment.module';
import { GameModule } from '../game/game.module';
import { TokenModule } from '../token/token.module';
import { QuestModule } from '../quests/quest.module';

@Module({
    imports: [CommentModule, GameModule, TokenModule, QuestModule],
    controllers: [UsersController],
    providers: [UsersService, UsersRepository],
    exports: [UsersRepository, UsersService],
})
export class UsersModule {}
