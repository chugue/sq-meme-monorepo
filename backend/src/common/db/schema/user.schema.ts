import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import {
    index,
    json,
    serial,
    text,
    timestamp,
    varchar,
} from 'drizzle-orm/pg-core';
import { squidSchema } from './common';
import { comments } from './comment.schema';

// Check-in record type
export interface CheckInRecord {
    day: string; // ISO date string (e.g. "2025-12-02")
    currentStreak: number;
}

// Other token balance type
export interface OtherTokenBalance {
    tokenAddress: string;
    tokenSymbol: string;
    balance: string; // BigInt -> string
}

export const users = squidSchema.table(
    'users',
    {
        id: serial('id').primaryKey(),

        // Wallet address (unique identifier)
        walletAddress: varchar('wallet_address', { length: 42 })
            .notNull()
            .unique(),

        // User basic info
        userName: varchar('user_name', { length: 64 }),
        userTag: varchar('user_tag', { length: 32 }), // User tag (e.g. @username)
        profileImage: text('profile_image'), // URL or base64

        // External link
        memexLink: text('memex_link'),

        // Token balances (BigInt -> Text)
        mTokenBalance: text('m_token_balance').default('0').notNull(), // Main token
        myTokenBalance: text('my_token_balance').default('0').notNull(), // My token

        // Other token balances (JSON array)
        otherTokenBalances: json('other_token_balances')
            .$type<OtherTokenBalance[]>()
            .default([]),

        // Check-in history (JSON array)
        checkInHistory: json('check_in_history')
            .$type<CheckInRecord[]>()
            .default([]),

        createdAt: timestamp('created_at').defaultNow(),
        updatedAt: timestamp('updated_at')
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (table) => {
        return {
            walletIdx: index('user_wallet_idx').on(table.walletAddress),
            userNameIdx: index('user_name_idx').on(table.userName),
        };
    },
);

// Relations: users -> comments (one-to-many via walletAddress)
export const usersRelations = relations(users, ({ many }) => ({
    comments: many(comments),
}));

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
