import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { index, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { squidSchema } from './common';

export const tokens = squidSchema.table(
    'tokens',
    {
        id: serial('id').primaryKey(),

        // MemeX 프로필에서 스크래핑한 토큰 정보
        tokenAddress: varchar('token_address', { length: 42 })
            .notNull()
            .unique(),
        tokenImageUrl: text('token_image_url'),
        tokenUsername: varchar('token_username', { length: 64 }).notNull(),
        tokenUsertag: varchar('token_usertag', { length: 32 }).notNull(),
        tokenSymbol: varchar('token_symbol', { length: 32 }),

        createdAt: timestamp('created_at').defaultNow(),
        updatedAt: timestamp('updated_at')
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (table) => {
        return {
            tokenAddressIdx: index('token_address_idx').on(table.tokenAddress),
            usernameTagIdx: index('token_username_tag_idx').on(
                table.tokenUsername,
                table.tokenUsertag,
            ),
        };
    },
);

export type Token = InferSelectModel<typeof tokens>;
export type NewToken = InferInsertModel<typeof tokens>;
