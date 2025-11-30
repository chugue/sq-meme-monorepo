"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.games = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const common_1 = require("./common");
exports.games = common_1.squidSchema.table('games', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    gameId: (0, pg_core_1.text)('game_id').notNull(),
    gameAddress: (0, pg_core_1.varchar)('game_address', { length: 42 }).notNull(),
    gameToken: (0, pg_core_1.varchar)('game_token', { length: 42 }).notNull(),
    initiator: (0, pg_core_1.varchar)('initiator', { length: 42 }).notNull(),
    gameTime: (0, pg_core_1.text)('game_time').notNull(),
    endTime: (0, pg_core_1.timestamp)('end_time').notNull(),
    cost: (0, pg_core_1.text)('cost').notNull(),
    prizePool: (0, pg_core_1.text)('prize_pool').default('0').notNull(),
    isEnded: (0, pg_core_1.boolean)('is_ended').default(false).notNull(),
    lastCommentor: (0, pg_core_1.varchar)('last_commentor', { length: 42 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at')
        .defaultNow()
        .$onUpdate(() => new Date()),
}, (table) => {
    return {
        statusIdx: (0, pg_core_1.index)('status_idx').on(table.isEnded),
        addressIdx: (0, pg_core_1.index)('game_address_idx').on(table.gameAddress),
    };
});
//# sourceMappingURL=game.schema.js.map