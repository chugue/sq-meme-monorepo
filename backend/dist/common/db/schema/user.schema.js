"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRelations = exports.users = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const common_1 = require("./common");
const comment_schema_1 = require("./comment.schema");
exports.users = common_1.squidSchema.table('users', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    walletAddress: (0, pg_core_1.varchar)('wallet_address', { length: 42 })
        .notNull()
        .unique(),
    userName: (0, pg_core_1.varchar)('user_name', { length: 64 }),
    userTag: (0, pg_core_1.varchar)('user_tag', { length: 32 }),
    profileImage: (0, pg_core_1.text)('profile_image'),
    memexLink: (0, pg_core_1.text)('memex_link'),
    mTokenBalance: (0, pg_core_1.text)('m_token_balance').default('0').notNull(),
    myTokenBalance: (0, pg_core_1.text)('my_token_balance').default('0').notNull(),
    otherTokenBalances: (0, pg_core_1.json)('other_token_balances')
        .$type()
        .default([]),
    checkInHistory: (0, pg_core_1.json)('check_in_history')
        .$type()
        .default([]),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at')
        .defaultNow()
        .$onUpdate(() => new Date()),
}, (table) => {
    return {
        walletIdx: (0, pg_core_1.index)('user_wallet_idx').on(table.walletAddress),
        userNameIdx: (0, pg_core_1.index)('user_name_idx').on(table.userName),
    };
});
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ many }) => ({
    comments: many(comment_schema_1.comments),
}));
//# sourceMappingURL=user.schema.js.map