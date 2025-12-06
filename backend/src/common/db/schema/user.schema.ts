import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import {
    boolean,
    index,
    json,
    serial,
    text,
    timestamp,
    varchar,
} from 'drizzle-orm/pg-core';
import { squidSchema } from './common';
import { comments } from './comment.schema';
import { userQuests } from './quest.schema';

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

        // Wallet address (unique identifier) - MetaMask 지갑 주소
        walletAddress: varchar('wallet_address', { length: 42 })
            .notNull()
            .unique(),

        // MEMEX에 등록된 지갑 주소 (walletAddress와 다를 수 있음)
        memexWalletAddress: varchar('memex_wallet_address', { length: 42 }),

        // User basic info
        userName: varchar('user_name', { length: 64 }),
        userTag: varchar('user_tag', { length: 32 }), // User tag (e.g. @username)
        profileImage: text('profile_image'), // URL or base64

        // External link
        memexLink: text('memex_link'),

        // 사용자의 토큰 정보
        myTokenAddr: varchar('my_token_addr', { length: 42 }), // 사용자 토큰 컨트랙트 주소
        myTokenSymbol: varchar('my_token_symbol', { length: 32 }), // 사용자 토큰 심볼 (예: CC)

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

        // 약관 동의 여부
        isPolicyAgreed: boolean('is_policy_agreed').default(false).notNull(),

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

// Relations: users -> comments, userQuests (one-to-many via walletAddress)
export const usersRelations = relations(users, ({ many }) => ({
    comments: many(comments),
    quests: many(userQuests),
}));

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
