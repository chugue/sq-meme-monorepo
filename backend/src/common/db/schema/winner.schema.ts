import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { index, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { squidSchema } from './common';
import { games } from './game.schema';
import { users } from './user.schema';

export const winners = squidSchema.table(
    'winners',
    {
        id: serial('id').primaryKey(),

        // User relation (linked by walletAddress)
        walletAddress: varchar('wallet_address', { length: 42 })
            .notNull()
            .references(() => users.walletAddress, { onDelete: 'cascade' }),

        // Game relation (linked by gameId)
        gameId: text('game_id')
            .notNull()
            .references(() => games.gameId, { onDelete: 'cascade' }),

        // Prize info
        prize: text('prize').notNull(), // Winner's prize amount (BigInt -> Text)
        tokenSymbol: varchar('token_symbol', { length: 32 }).notNull(),
        tokenAddress: varchar('token_address', { length: 42 }).notNull(),

        // Claim transaction info
        claimTxHash: varchar('claim_tx_hash', { length: 66 }),

        claimedAt: timestamp('claimed_at').notNull(),
        createdAt: timestamp('created_at').defaultNow(),
    },
    (table) => {
        return {
            walletIdx: index('winner_wallet_idx').on(table.walletAddress),
            gameIdx: index('winner_game_idx').on(table.gameId),
            tokenIdx: index('winner_token_idx').on(table.tokenAddress),
        };
    },
);

// Relations
export const winnersRelations = relations(winners, ({ one }) => ({
    user: one(users, {
        fields: [winners.walletAddress],
        references: [users.walletAddress],
    }),
    game: one(games, {
        fields: [winners.gameId],
        references: [games.gameId],
    }),
}));

export type Winner = InferSelectModel<typeof winners>;
export type NewWinner = InferInsertModel<typeof winners>;
