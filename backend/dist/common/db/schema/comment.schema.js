"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.comments = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const common_1 = require("./common");
exports.comments = common_1.squidSchema.table('comments', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
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
//# sourceMappingURL=comment.schema.js.map