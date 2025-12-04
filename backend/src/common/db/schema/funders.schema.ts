import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import {
    index,
    serial,
    text,
    timestamp,
    varchar,
} from 'drizzle-orm/pg-core';
import { squidSchema } from './common';

export const funders = squidSchema.table(
    'funders',
    {
        id: serial('id').primaryKey(),

        // 게임 ID (컨트랙트상의 gameId)
        gameId: text('game_id').notNull(),

        // 펀더 지갑 주소
        funderAddress: varchar('funder_address', { length: 42 }).notNull(),

        // 누적 펀딩 금액 (해당 펀더의 총 펀딩액)
        totalFunding: text('total_funding').notNull(),

        // 트랜잭션 해시 배열 (펀딩 이력)
        txHashes: text('tx_hashes').array().notNull().default([]),

        createdAt: timestamp('created_at').defaultNow(),
        updatedAt: timestamp('updated_at').defaultNow(),
    },
    (table) => {
        return {
            gameIdIdx: index('funders_game_id_idx').on(table.gameId),
            funderIdx: index('funders_funder_address_idx').on(
                table.funderAddress,
            ),
            gameIdFunderIdx: index('funders_game_funder_idx').on(
                table.gameId,
                table.funderAddress,
            ),
        };
    },
);

export type Funder = InferSelectModel<typeof funders>;
export type NewFunder = InferInsertModel<typeof funders>;
