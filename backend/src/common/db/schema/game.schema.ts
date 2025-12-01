import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import {
    boolean,
    index,
    serial,
    text,
    timestamp,
    varchar,
} from 'drizzle-orm/pg-core';
import { squidSchema } from './common';

export const games = squidSchema.table(
    'games',
    {
        // 내부 관리용 ID (1, 2, 3...)
        id: serial('id').primaryKey(),

        // 1. 게임 기본 정보
        gameId: text('game_id').notNull(), // 컨트랙트상의 ID (uint256)
        gameAddress: varchar('game_address', { length: 42 }).notNull(),
        gameToken: varchar('game_token', { length: 42 }).notNull(),
        tokenSymbol: varchar('token_symbol', { length: 32 }), // 토큰 심볼 (예: MTK)
        tokenName: varchar('token_name', { length: 128 }), // 토큰 이름 (예: MockToken)
        initiator: varchar('initiator', { length: 42 }).notNull(),

        // 2. 시간 관련
        gameTime: text('game_time').notNull(), // 초기 설정된 타이머 시간 (초 단위)
        endTime: timestamp('end_time').notNull(), // 실제 종료 시각 (Date 객체로 변환 저장)

        // 3. 돈 관련 (BigInt -> Text)
        cost: text('cost').notNull(),
        prizePool: text('prize_pool').default('0').notNull(),

        // 4. 상태 관련
        // isClaimed: 상금 수령 여부 (컨트랙트에서 전송)
        // 게임 종료 여부(isEnded)는 endTime과 현재 시간 비교로 계산
        isClaimed: boolean('is_claimed').default(false).notNull(),
        lastCommentor: varchar('last_commentor', { length: 42 }).notNull(),

        createdAt: timestamp('created_at').defaultNow(),
        updatedAt: timestamp('updated_at')
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (table) => {
        return {
            // ⚡️ 검색 속도를 위한 인덱스 추가
            claimedIdx: index('claimed_idx').on(table.isClaimed), // 상금 수령 여부
            addressIdx: index('game_address_idx').on(table.gameAddress), // 주소로 게임 찾기
            tokenIdx: index('game_token_idx').on(table.gameToken), // 토큰 주소로 게임 찾기
        };
    },
);

export type Game = InferSelectModel<typeof games>;
export type NewGame = InferInsertModel<typeof games>;
