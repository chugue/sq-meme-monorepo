"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentLikes = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const common_1 = require("./common");
const comment_schema_1 = require("./comment.schema");
exports.commentLikes = common_1.squidSchema.table('comment_likes', {
    id: (0, pg_core_1.serial)('id').notNull(),
    commentId: (0, pg_core_1.serial)('comment_id')
        .notNull()
        .references(() => comment_schema_1.comments.id, { onDelete: 'cascade' }),
    userAddress: (0, pg_core_1.varchar)('user_address', { length: 42 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
}, (table) => {
    return {
        pk: (0, pg_core_1.primaryKey)({ columns: [table.commentId, table.userAddress] }),
        commentIdx: (0, pg_core_1.index)('comment_like_comment_idx').on(table.commentId),
        userIdx: (0, pg_core_1.index)('comment_like_user_idx').on(table.userAddress),
    };
});
//# sourceMappingURL=comment-like.schema.js.map