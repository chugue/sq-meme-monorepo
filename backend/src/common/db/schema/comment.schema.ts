import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import {
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
        gameId: text('game_id').notNull(), // 컨트랙트상의 게임 ID (uint256)

        // 댓글 내용
        commentor: varchar('commentor', { length: 42 }).notNull(),
        message: text('message').notNull(),
        imageUrl: text('image_url'), // 댓글 이미지 URL (선택)
        likeCount: integer('like_count').default(0).notNull(),

        createdAt: timestamp('created_at').notNull(), // 블록 타임스탬프
        endTime: timestamp('end_time').notNull(), // 댓글 종료 시간
    },
    (table) => {
        return {
            gameIdIdx: index('game_id_idx').on(table.gameId),
            lastCommentIdx: index('last_comment_idx').on(table.gameId),
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
