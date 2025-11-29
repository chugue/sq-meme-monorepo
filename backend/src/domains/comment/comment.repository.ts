import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from 'src/common/db/db.module';
import * as schema from 'src/common/db/schema';
import {
    CommentAddedEvent,
    CommentAddedEventSchema,
} from 'src/common/validator/comment.validator';

@Injectable()
export class CommentRepository {
    private readonly logger = new Logger(CommentRepository.name);

    constructor(
        @Inject(DrizzleAsyncProvider)
        private readonly db: NodePgDatabase<typeof schema>,
    ) {}

    /**
     * @description 댓글 이벤트를 검증하고 저장하며 게임 상태를 업데이트합니다.
     * @param rawEvents 블록체인에서 수신한 원본 이벤트 데이터 배열
     */
    async addComments(rawEvents: unknown[]) {
        if (rawEvents.length === 0) return;

        const comments = rawEvents
            .map((event) => {
                const result = CommentAddedEventSchema.safeParse(event);
                if (!result.success) {
                    this.logger.error(`Invalid comment event: ${result.error}`);
                    return null;
                }
                return result.data;
            })
            .filter((c): c is CommentAddedEvent => c !== null);

        if (comments.length === 0) return;

        for (const comment of comments) {
            try {
                await this.db.transaction(async (tx) => {
                    // 1. 댓글 저장 (스냅샷: 당시의 상태)
                    await tx.insert(schema.comments).values({
                        gameAddress: comment.gameAddress,
                        commentor: comment.commentor,
                        message: comment.message,
                        likeCount: 0,
                        endTime: comment.newEndTime,
                        currentPrizePool: comment.prizePool,
                        isWinnerComment: false,
                        createdAt: comment.timestamp,
                    });

                    // 2. 게임 상태 업데이트 (종료시간, 상금풀, 마지막 댓글 작성자)
                    await tx
                        .update(schema.games)
                        .set({
                            endTime: comment.newEndTime,
                            prizePool: comment.prizePool,
                            lastCommentor: comment.commentor,
                        })
                        .where(
                            eq(schema.games.gameAddress, comment.gameAddress),
                        );
                });

                this.logger.log(
                    `댓글 저장 완료: 게임 ${comment.gameAddress}`,
                );
            } catch (error) {
                this.logger.error(`댓글 저장 실패: ${error.message}`);
            }
        }
    }
}
