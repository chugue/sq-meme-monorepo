import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from 'src/common/db/db.module';
import * as schema from 'src/common/db/schema';
import {
    NewPendingTransaction,
    PendingTransaction,
    TransactionStatus,
} from 'src/common/db/schema/pending-transaction.schema';

@Injectable()
export class TransactionRepository {
    private readonly logger = new Logger(TransactionRepository.name);

    constructor(
        @Inject(DrizzleAsyncProvider)
        private readonly db: NodePgDatabase<typeof schema>,
    ) {}

    /**
     * 새 pending 트랜잭션 등록
     */
    async create(
        data: NewPendingTransaction,
    ): Promise<PendingTransaction | null> {
        try {
            const [result] = await this.db
                .insert(schema.pendingTransactions)
                .values(data)
                .returning();

            this.logger.log(`✅ 트랜잭션 등록: ${data.txHash}`);
            return result;
        } catch (error) {
            // 중복 txHash인 경우
            if (error.code === '23505') {
                this.logger.warn(`⚠️ 이미 등록된 트랜잭션: ${data.txHash}`);
                return null;
            }
            this.logger.error(`❌ 트랜잭션 등록 실패: ${error.message}`);
            throw error;
        }
    }

    /**
     * pending 상태인 트랜잭션 목록 조회
     */
    async findPending(): Promise<PendingTransaction[]> {
        return this.db
            .select()
            .from(schema.pendingTransactions)
            .where(eq(schema.pendingTransactions.status, 'pending'));
    }

    /**
     * 트랜잭션 상태 업데이트
     */
    async updateStatus(
        txHash: string,
        status: TransactionStatus,
        errorMessage?: string,
    ): Promise<void> {
        try {
            await this.db
                .update(schema.pendingTransactions)
                .set({
                    status,
                    errorMessage: errorMessage || null,
                })
                .where(eq(schema.pendingTransactions.txHash, txHash));

            this.logger.log(`✅ 트랜잭션 상태 업데이트: ${txHash} → ${status}`);
        } catch (error) {
            this.logger.error(
                `❌ 트랜잭션 상태 업데이트 실패: ${error.message}`,
            );
            throw error;
        }
    }

    /**
     * 재시도 횟수 증가
     */
    async incrementRetryCount(txHash: string): Promise<void> {
        try {
            await this.db.execute(
                `UPDATE squid_meme.pending_transactions
                 SET retry_count = retry_count + 1, updated_at = NOW()
                 WHERE tx_hash = '${txHash}'`,
            );
        } catch (error) {
            this.logger.error(`❌ 재시도 횟수 증가 실패: ${error.message}`);
        }
    }
}
