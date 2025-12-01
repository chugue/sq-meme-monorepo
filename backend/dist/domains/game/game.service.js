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
const config_1 = require("@nestjs/config");
const ethers_1 = require("ethers");
const providers_1 = require("../../common/providers");
const game_repository_1 = require("./game.repository");
const GAME_CREATED_EVENT = 'event GameCreated(uint256 gameId, address indexed gameAddr, address indexed gameTokenAddr, string tokenSymbol, string tokenName, address initiator, uint256 gameTime, uint256 endTime, uint256 cost, uint256 prizePool, address lastCommentor, bool isClaimed)';
const PRIZE_CLAIMED_EVENT = 'event PrizeClaimed(address indexed winner, uint256 winnerShare, uint256 platformShare, uint256 timestamp)';
let GameService = GameService_1 = class GameService {
    configService;
    ethereumProvider;
    gameRepository;
    logger = new common_1.Logger(GameService_1.name);
    gameCreatedIface;
    prizeClaimedIface;
    isListening = false;
    constructor(configService, ethereumProvider, gameRepository) {
        this.configService = configService;
        this.ethereumProvider = ethereumProvider;
        this.gameRepository = gameRepository;
        this.gameCreatedIface = new ethers_1.ethers.Interface([GAME_CREATED_EVENT]);
        this.prizeClaimedIface = new ethers_1.ethers.Interface([PRIZE_CLAIMED_EVENT]);
    }
    onModuleInit() {
        this.startListening();
    }
    onModuleDestroy() {
        this.stopListening();
    }
    async startListening() {
        const factoryAddress = this.configService.get('GAME_FACTORY_ADDRESS');
        if (!factoryAddress) {
            this.logger.warn('GAME_FACTORY_ADDRESS is not configured, skipping listener');
            return;
        }
        const provider = this.ethereumProvider.getProvider();
        const topic = this.gameCreatedIface.getEvent('GameCreated')?.topicHash;
        if (!topic) {
            this.logger.error('Failed to generate GameCreated event topic');
            return;
        }
        this.logger.log(`📋 Event topic hash: ${topic}`);
        try {
            const network = await provider.getNetwork();
            this.logger.log(`🌐 Connected to network: ${network.name} (chainId: ${network.chainId})`);
            const blockNumber = await provider.getBlockNumber();
            this.logger.log(`📦 Current block number: ${blockNumber}`);
        }
        catch (error) {
            this.logger.error(`❌ WebSocket connection check failed: ${error.message}`);
        }
        const filter = {
            address: factoryAddress,
            topics: [topic],
        };
        this.logger.log(`🔍 Filter: ${JSON.stringify(filter)}`);
        provider.on(filter, (log) => {
            this.logger.log(`📨 Raw log received: ${JSON.stringify(log, (_, v) => typeof v === 'bigint' ? v.toString() : v)}`);
            this.handleGameCreatedLog(log);
        });
        this.logger.log(`✅ GameCreated event listener started (Factory: ${factoryAddress})`);
        const prizeClaimedTopic = this.prizeClaimedIface.getEvent('PrizeClaimed')?.topicHash;
        if (prizeClaimedTopic) {
            const prizeClaimedFilter = {
                topics: [prizeClaimedTopic],
            };
            provider.on(prizeClaimedFilter, (log) => {
                this.logger.log(`🏆 PrizeClaimed log received: ${JSON.stringify(log, (_, v) => typeof v === 'bigint' ? v.toString() : v)}`);
                this.handlePrizeClaimedLog(log);
            });
            this.logger.log(`✅ PrizeClaimed event listener started`);
        }
        this.isListening = true;
    }
    stopListening() {
        if (this.isListening) {
            this.ethereumProvider.getProvider().removeAllListeners();
            this.isListening = false;
            this.logger.log('GameCreated event listener stopped');
        }
    }
    async handleGameCreatedLog(log) {
        try {
            const decoded = this.gameCreatedIface.decodeEventLog('GameCreated', log.data, log.topics);
            const rawEvent = decoded.toObject();
            this.logger.log(`📥 GameCreated 이벤트 수신: ${JSON.stringify(rawEvent, (_, v) => typeof v === 'bigint' ? v.toString() : v)}`);
            const result = await this.gameRepository.createGames([rawEvent]);
            if (result.length === 0) {
                this.logger.warn('⚠️ 게임 저장 결과가 비어있음 - 검증 실패 또는 DB 오류');
            }
        }
        catch (error) {
            this.logger.error(`Event processing failed: ${error.message}`);
        }
    }
    async handlePrizeClaimedLog(log) {
        try {
            const decoded = this.prizeClaimedIface.decodeEventLog('PrizeClaimed', log.data, log.topics);
            const rawEvent = decoded.toObject();
            const gameAddress = log.address.toLowerCase();
            this.logger.log(`🏆 PrizeClaimed 이벤트 수신: gameAddress=${gameAddress}, winner=${rawEvent.winner}`);
            await this.gameRepository.updateGameState(gameAddress, {
                isClaimed: true,
            });
            this.logger.log(`✅ 게임 상금 수령 완료 처리: ${gameAddress}`);
        }
        catch (error) {
            this.logger.error(`PrizeClaimed event processing failed: ${error.message}`);
        }
    }
};
exports.GameService = GameService;
exports.GameService = GameService = GameService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        providers_1.EthereumProvider,
        game_repository_1.GameRepository])
], GameService);
//# sourceMappingURL=game.service.js.map