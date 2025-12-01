"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentsRelations = exports.comments = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const common_1 = require("./common");
const user_schema_1 = require("./user.schema");
exports.comments = common_1.squidSchema.table('comments', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    txHash: (0, pg_core_1.varchar)('tx_hash', { length: 66 }).unique(),
    gameAddress: (0, pg_core_1.varchar)('game_address', { length: 42 }).notNull(),
    commentor: (0, pg_core_1.varchar)('commentor', { length: 42 }).notNull(),
    message: (0, pg_core_1.text)('message').notNull(),
    likeCount: (0, pg_core_1.integer)('like_count').default(0).notNull(),
    endTime: (0, pg_core_1.timestamp)('end_time').notNull(),
    currentPrizePool: (0, pg_core_1.text)('current_prize_pool').notNull(),
    isWinnerComment: (0, pg_core_1.boolean)('is_winner_comment').default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull(),
}, (table) => {
    return {
        gameIdx: (0, pg_core_1.index)('game_idx').on(table.gameAddress),
        lastCommentIdx: (0, pg_core_1.index)('last_comment_idx').on(table.gameAddress, table.isWinnerComment),
    };
});
exports.commentsRelations = (0, drizzle_orm_1.relations)(exports.comments, ({ one }) => ({
    user: one(user_schema_1.users, {
        fields: [exports.comments.commentor],
        references: [user_schema_1.users.walletAddress],
    }),
}));
//# sourceMappingURL=comment.schema.js.map