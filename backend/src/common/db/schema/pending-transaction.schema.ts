import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { index, integer, serial, timestamp, varchar } from 'drizzle-orm/pg-core';
import { squidSchema } from './common';

/**
 * 이벤트 타입 enum
 * - PRIZE_CLAIMED: 상금 수령
 * - GAME_CREATED: 게임 생성
 * - COMMENT_ADDED: 댓글 추가
 */
export type EventType = 'PRIZE_CLAIMED' | 'GAME_CREATED' | 'COMMENT_ADDED';

/**
 * 트랜잭션 상태 enum
 * - pending: 확정 대기 중
 * - confirmed: 확정됨 (이벤트 처리 완료)
 * - failed: 실패 (revert 또는 처리 오류)
 */
export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export const pendingTransactions = squidSchema.table(
    'pending_transactions',
    {
        id: serial('id').primaryKey(),

        // 트랜잭션 해시 (유니크)
        txHash: varchar('tx_hash', { length: 66 }).notNull().unique(),

        // 관련 게임 주소
        gameAddress: varchar('game_address', { length: 42 }).notNull(),

        // 이벤트 타입: PRIZE_CLAIMED, GAME_CREATED, COMMENT_ADDED
        eventType: varchar('event_type', { length: 32 }).notNull(),

        // 상태: pending, confirmed, failed
        status: varchar('status', { length: 16 }).notNull().default('pending'),

        // 실패 시 에러 메시지
        errorMessage: varchar('error_message', { length: 512 }),

        // 재시도 횟수 (최대 재시도 초과 시 failed로 변경)
        retryCount: integer('retry_count').default(0).notNull(),

        createdAt: timestamp('created_at').defaultNow(),
        updatedAt: timestamp('updated_at')
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (table) => {
        return {
            // pending 상태 조회용 인덱스
            statusIdx: index('pending_tx_status_idx').on(table.status),
            // 게임 주소로 조회용 인덱스
            gameAddressIdx: index('pending_tx_game_address_idx').on(
                table.gameAddress,
            ),
        };
    },
);

export type PendingTransaction = InferSelectModel<typeof pendingTransactions>;
export type NewPendingTransaction = InferInsertModel<typeof pendingTransactions>;
