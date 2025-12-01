"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pendingTransactions = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const common_1 = require("./common");
exports.pendingTransactions = common_1.squidSchema.table('pending_transactions', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    txHash: (0, pg_core_1.varchar)('tx_hash', { length: 66 }).notNull().unique(),
    gameAddress: (0, pg_core_1.varchar)('game_address', { length: 42 }).notNull(),
    eventType: (0, pg_core_1.varchar)('event_type', { length: 32 }).notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 16 }).notNull().default('pending'),
    errorMessage: (0, pg_core_1.varchar)('error_message', { length: 512 }),
    retryCount: (0, pg_core_1.integer)('retry_count').default(0).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at')
        .defaultNow()
        .$onUpdate(() => new Date()),
}, (table) => {
    return {
        statusIdx: (0, pg_core_1.index)('pending_tx_status_idx').on(table.status),
        gameAddressIdx: (0, pg_core_1.index)('pending_tx_game_address_idx').on(table.gameAddress),
    };
});
//# sourceMappingURL=pending-transaction.schema.js.map