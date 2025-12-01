import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GameService } from '../game/game.service';
import { TransactionRepository } from './transaction.repository';

const MAX_RETRY_COUNT = 10;

@Injectable()
export class TransactionService {
    private readonly logger = new Logger(TransactionService.name);
    private isProcessing = false;

    constructor(
        private readonly transactionRepository: TransactionRepository,
        private readonly gameService: GameService,
    ) {}

    /**
     * 5초마다 pending 트랜잭션을 확인하고 처리
     */
    @Cron(CronExpression.EVERY_5_SECONDS)
    async processPendingTransactions() {
        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;

        try {
            const pendingTxs = await this.transactionRepository.findPending();

            if (pendingTxs.length === 0) {
                return;
            }

            this.logger.log(
                `📋 처리할 pending 트랜잭션: ${pendingTxs.length}개`,
            );

            for (const tx of pendingTxs) {
                await this.processTransaction(tx);
            }
        } catch (error) {
            this.logger.error(`Cron 실행 오류: ${error.message}`);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * 트랜잭션 처리
     * @param tx 트랜잭션
     * @returns 성공 여부
     */
    private async processTransaction(tx: {
        txHash: string;
        gameAddress: string;
        eventType: string;
        retryCount: number;
    }) {
        try {
            let success = false;

            switch (tx.eventType) {
                case 'PRIZE_CLAIMED':
                    success =
                        await this.gameService.processPrizeClaimedTransaction(
                            tx.txHash,
                            tx.gameAddress,
                        );
                    break;

                case 'GAME_CREATED':
                case 'COMMENT_ADDED':
                    // 추후 구현
                    this.logger.warn(
                        `미구현 이벤트 타입: ${tx.eventType}, txHash: ${tx.txHash}`,
                    );
                    success = true; // 일단 confirmed 처리
                    break;

                default:
                    this.logger.error(
                        `알 수 없는 이벤트 타입: ${tx.eventType}`,
                    );
                    await this.transactionRepository.updateStatus(
                        tx.txHash,
                        'failed',
                        `알 수 없는 이벤트 타입: ${tx.eventType}`,
                    );
                    return;
            }

            if (success) {
                await this.transactionRepository.updateStatus(
                    tx.txHash,
                    'confirmed',
                );
                this.logger.log(`✅ 트랜잭션 확정: ${tx.txHash}`);
            } else {
                // 실패 시 재시도 횟수 증가
                await this.transactionRepository.incrementRetryCount(tx.txHash);

                if (tx.retryCount + 1 >= MAX_RETRY_COUNT) {
                    await this.transactionRepository.updateStatus(
                        tx.txHash,
                        'failed',
                        '최대 재시도 횟수 초과',
                    );
                    this.logger.error(
                        `❌ 최대 재시도 초과로 실패 처리: ${tx.txHash}`,
                    );
                } else {
                    this.logger.warn(
                        `⚠️ 트랜잭션 처리 실패, 재시도 예정: ${tx.txHash} (${tx.retryCount + 1}/${MAX_RETRY_COUNT})`,
                    );
                }
            }
        } catch (error) {
            this.logger.error(
                `트랜잭션 처리 오류: ${tx.txHash}, ${error.message}`,
            );
            await this.transactionRepository.incrementRetryCount(tx.txHash);
        }
    }
}
