import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import * as path from 'path';

import { CommonModule } from './common/common.module';
import { DbModule } from './common/db/db.module';
import { GameModule } from './domains/game/game.module';
import { CommentModule } from './domains/comment/comment.module';
import { TransactionModule } from './domains/transaction/transaction.module';
import { AppController } from './app.controller';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        ConfigModule.forRoot({
            isGlobal: true,
            // 환경변수 우선순위:
            // 1. process.env (Railway 등 클라우드 환경에서 설정된 환경변수)
            // 2. .env.local (로컬 개발용, gitignore에 추가)
            // 3. 루트 디렉토리 .env (공유 설정)
            envFilePath: [
                '.env.local',
                path.resolve(process.cwd(), '..', '.env'),
            ],
        }),
        CommonModule,
        DbModule,
        GameModule,
        CommentModule,
        TransactionModule,
    ],
    controllers: [AppController],
    providers: [],
})
export class AppModule {}
