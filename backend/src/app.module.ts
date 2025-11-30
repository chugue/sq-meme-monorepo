import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CommonModule } from './common/common.module';
import { DbModule } from './common/db/db.module';
import { GameModule } from './domains/game/game.module';
import { CommentModule } from './domains/comment/comment.module';
import { AppController } from './app.controller';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '../.env'],
        }),
        CommonModule,
        DbModule,
        GameModule,
        CommentModule,
    ],
    controllers: [AppController],
    providers: [],
})
export class AppModule {}
