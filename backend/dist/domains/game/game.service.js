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
var GameService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameService = void 0;
const common_1 = require("@nestjs/common");
const ethers_1 = require("ethers");
const providers_1 = require("../../common/providers");
const types_1 = require("../../common/types");
const game_repository_1 = require("./game.repository");
const PRIZE_CLAIMED_EVENT = 'event PrizeClaimed(address indexed winner, uint256 winnerShare, uint256 platformShare, uint256 timestamp)';
let GameService = GameService_1 = class GameService {
    ethereumProvider;
    gameRepository;
    logger = new common_1.Logger(GameService_1.name);
    prizeClaimedIface;
    constructor(ethereumProvider, gameRepository) {
        this.ethereumProvider = ethereumProvider;
        this.gameRepository = gameRepository;
        this.prizeClaimedIface = new ethers_1.ethers.Interface([PRIZE_CLAIMED_EVENT]);
    }
    async processPrizeClaimedTransaction(txHash, gameAddress) {
        try {
            const receipt = await this.ethereumProvider.getTransactionReceipt(txHash);
            if (!receipt) {
                this.logger.warn(`트랜잭션 영수증 없음: ${txHash}`);
                return false;
            }
            if (receipt.status === 0) {
                this.logger.warn(`트랜잭션 실패 (revert): ${txHash}`);
                return false;
            }
            const prizeClaimedTopic = this.prizeClaimedIface.getEvent('PrizeClaimed')?.topicHash;
            const prizeClaimedLog = receipt.logs.find((log) => log.topics[0] === prizeClaimedTopic &&
                log.address.toLowerCase() === gameAddress.toLowerCase());
            if (!prizeClaimedLog) {
                this.logger.warn(`PrizeClaimed 이벤트 없음: ${txHash}, game: ${gameAddress}`);
                return false;
            }
            const decoded = this.prizeClaimedIface.decodeEventLog('PrizeClaimed', prizeClaimedLog.data, prizeClaimedLog.topics);
            const rawEvent = decoded.toObject();
            this.logger.log(`🏆 PrizeClaimed 확인: gameAddress=${gameAddress}, winner=${rawEvent.winner}`);
            await this.gameRepository.updateGameState(gameAddress.toLowerCase(), {
                isClaimed: true,
            });
            this.logger.log(`✅ 게임 상금 수령 완료 처리: ${gameAddress}`);
            return true;
        }
        catch (error) {
            this.logger.error(`PrizeClaimed 처리 실패: ${error.message}`, error.stack);
            return false;
        }
    }
    async createGame(data) {
        try {
            const result = await this.gameRepository.createFromFrontend(data);
            if (!result) {
                return types_1.Result.fail('게임 저장에 실패했습니다.');
            }
            return types_1.Result.ok(result);
        }
        catch (error) {
            this.logger.error(`Create game failed: ${error.message}`);
            return types_1.Result.fail('게임 저장에 실패했습니다.');
        }
    }
};
exports.GameService = GameService;
exports.GameService = GameService = GameService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [providers_1.EthereumProvider,
        game_repository_1.GameRepository])
], GameService);
//# sourceMappingURL=game.service.js.map