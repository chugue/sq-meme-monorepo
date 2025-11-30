import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import {
    index,
    primaryKey,
    serial,
    timestamp,
    varchar,
} from 'drizzle-orm/pg-core';
import { squidSchema } from './common';
import { comments } from './comment.schema';

export const commentLikes = squidSchema.table(
    'comment_likes',
    {
        id: serial('id').notNull(),

        // 어떤 댓글에 대한 좋아요인지
        commentId: serial('comment_id')
            .notNull()
            .references(() => comments.id, { onDelete: 'cascade' }),

        // 누가 좋아요를 눌렀는지 (지갑 주소)
        userAddress: varchar('user_address', { length: 42 }).notNull(),

        createdAt: timestamp('created_at').defaultNow().notNull(),
    },
    (table) => {
        return {
            // 복합 Primary Key: 한 사용자가 같은 댓글에 중복 좋아요 방지
            pk: primaryKey({ columns: [table.commentId, table.userAddress] }),

            // 댓글별 좋아요 조회 최적화
            commentIdx: index('comment_like_comment_idx').on(table.commentId),

            // 사용자별 좋아요 조회 최적화
            userIdx: index('comment_like_user_idx').on(table.userAddress),
        };
    },
);

export type CommentLike = InferSelectModel<typeof commentLikes>;
export type NewCommentLike = InferInsertModel<typeof commentLikes>;
