import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import {
    boolean,
    index,
    integer,
    serial,
    text,
    timestamp,
    varchar,
} from 'drizzle-orm/pg-core';
import { squidSchema } from './common';
import { users } from './user.schema';

export const comments = squidSchema.table(
    'comments',
    {
        id: serial('id').primaryKey(),

        // 트랜잭션 해시 (중복 체크용)
        txHash: varchar('tx_hash', { length: 66 }).unique(),

        // 어떤 게임의 댓글인지
        gameAddress: varchar('game_address', { length: 42 }).notNull(),

        // 댓글 내용
        commentor: varchar('commentor', { length: 42 }).notNull(),
        message: text('message').notNull(),
        likeCount: integer('like_count').default(0).notNull(),

        // 당시 게임 상태 스냅샷
        endTime: timestamp('end_time').notNull(), // 그 당시의 종료 예정 시간
        currentPrizePool: text('current_prize_pool').notNull(), // 그 당시의 상금 풀

        // 상태
        isWinnerComment: boolean('is_winner_comment').default(false).notNull(),

        createdAt: timestamp('created_at').notNull(), // 블록 타임스탬프
    },
    (table) => {
        return {
            gameIdx: index('game_idx').on(table.gameAddress),
            lastCommentIdx: index('last_comment_idx').on(
                table.gameAddress,
                table.isWinnerComment,
            ),
        };
    },
);

// Relations: comments -> users (many-to-one via commentor/walletAddress)
export const commentsRelations = relations(comments, ({ one }) => ({
    user: one(users, {
        fields: [comments.commentor],
        references: [users.walletAddress],
    }),
}));

export type Comment = InferSelectModel<typeof comments>;
export type NewComment = InferInsertModel<typeof comments>;
