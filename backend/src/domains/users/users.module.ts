import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { CommentModule } from '../comment/comment.module';

@Module({
    imports: [CommentModule],
    controllers: [UsersController],
    providers: [UsersService, UsersRepository],
    exports: [UsersRepository, UsersService],
})
export class UsersModule {}
