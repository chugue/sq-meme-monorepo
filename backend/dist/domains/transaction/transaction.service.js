"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TransactionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const game_service_1 = require("../game/game.service");
const transaction_repository_1 = require("./transaction.repository");
const MAX_RETRY_COUNT = 10;
let TransactionService = TransactionService_1 = class TransactionService {
    transactionRepository;
    gameService;
    logger = new common_1.Logger(TransactionService_1.name);
    isProcessing = false;
    constructor(transactionRepository, gameService) {
        this.transactionRepository = transactionRepository;
        this.gameService = gameService;
    }
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
            this.logger.log(`📋 처리할 pending 트랜잭션: ${pendingTxs.length}개`);
            for (const tx of pendingTxs) {
                await this.processTransaction(tx);
            }
        }
        catch (error) {
            this.logger.error(`Cron 실행 오류: ${error.message}`);
        }
        finally {
            this.isProcessing = false;
        }
    }
    async processTransaction(tx) {
        try {
            let success = false;
            switch (tx.eventType) {
                case 'PRIZE_CLAIMED':
                    success =
                        await this.gameService.processPrizeClaimedTransaction(tx.txHash, tx.gameAddress);
                    break;
                case 'GAME_CREATED':
                case 'COMMENT_ADDED':
                    this.logger.warn(`미구현 이벤트 타입: ${tx.eventType}, txHash: ${tx.txHash}`);
                    success = true;
                    break;
                default:
                    this.logger.error(`알 수 없는 이벤트 타입: ${tx.eventType}`);
                    await this.transactionRepository.updateStatus(tx.txHash, 'failed', `알 수 없는 이벤트 타입: ${tx.eventType}`);
                    return;
            }
            if (success) {
                await this.transactionRepository.updateStatus(tx.txHash, 'confirmed');
                this.logger.log(`✅ 트랜잭션 확정: ${tx.txHash}`);
            }
            else {
                await this.transactionRepository.incrementRetryCount(tx.txHash);
                if (tx.retryCount + 1 >= MAX_RETRY_COUNT) {
                    await this.transactionRepository.updateStatus(tx.txHash, 'failed', '최대 재시도 횟수 초과');
                    this.logger.error(`❌ 최대 재시도 초과로 실패 처리: ${tx.txHash}`);
                }
                else {
                    this.logger.warn(`⚠️ 트랜잭션 처리 실패, 재시도 예정: ${tx.txHash} (${tx.retryCount + 1}/${MAX_RETRY_COUNT})`);
                }
            }
        }
        catch (error) {
            this.logger.error(`트랜잭션 처리 오류: ${tx.txHash}, ${error.message}`);
            await this.transactionRepository.incrementRetryCount(tx.txHash);
        }
    }
};
exports.TransactionService = TransactionService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_SECONDS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TransactionService.prototype, "processPendingTransactions", null);
exports.TransactionService = TransactionService = TransactionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transaction_repository_1.TransactionRepository,
        game_service_1.GameService])
], TransactionService);
//# sourceMappingURL=transaction.service.js.map