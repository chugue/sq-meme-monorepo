import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { CommentModule } from '../comment/comment.module';
import { GameModule } from '../game/game.module';

@Module({
    imports: [CommentModule, GameModule],
    controllers: [UsersController],
    providers: [UsersService, UsersRepository],
    exports: [UsersRepository, UsersService],
})
export class UsersModule {}
