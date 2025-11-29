"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BlockchainService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const viem = __importStar(require("viem"));
const blockchain_constant_1 = require("./blockchain.constant");
const game_repository_1 = require("../game/game.repository");
const comment_repository_1 = require("../comment/comment.repository");
let BlockchainService = BlockchainService_1 = class BlockchainService {
    configService;
    gameRepository;
    commentRepository;
    logger = new common_1.Logger(BlockchainService_1.name);
    client;
    unwatchGameCreated;
    unwatchCommentAdded;
    constructor(configService, gameRepository, commentRepository) {
        this.configService = configService;
        this.gameRepository = gameRepository;
        this.commentRepository = commentRepository;
    }
    onModuleInit() {
        this.connect();
    }
    onModuleDestroy() {
        this.logger.log('🛑 Blockchain Service 종료 중...');
        if (this.unwatchGameCreated)
            this.unwatchGameCreated();
        if (this.unwatchCommentAdded)
            this.unwatchCommentAdded();
    }
    getClient() {
        return this.client;
    }
    connect() {
        this.logger.log('🔌 Insectarium Testnet 연결 중...');
        this.client = viem.createPublicClient({
            chain: blockchain_constant_1.INSECTARIUM_CHAIN,
            transport: viem.webSocket(),
        });
        this.logger.log('✅ WebSocket 연결 완료!');
        this.startListening();
    }
    startListening() {
        this.logger.log('🎧 컨트랙트 이벤트 리스너 시작...');
        this.watchGameCreated();
        this.watchCommentAdded();
    }
    watchGameCreated() {
        const factoryAddress = this.configService.get('GAME_FACTORY_ADDRESS');
        if (!factoryAddress) {
            this.logger.error('🚨 GAME_FACTORY_ADDRESS가 .env에 없습니다');
            return;
        }
        const gameCreatedEvent = viem.parseAbiItem('event GameCreated(uint256 gameId, address indexed gameAddr, address indexed gameTokenAddr, address initiator, uint256 remainTime, uint256 endTime, uint256 cost, uint256 prizePool, bool isEnded, address lastCommentor)');
        this.unwatchGameCreated = this.client.watchContractEvent({
            address: factoryAddress,
            abi: [gameCreatedEvent],
            eventName: 'GameCreated',
            onLogs: async (logs) => {
                const rawEvents = logs.map((log) => log.args);
                if (rawEvents.length > 0) {
                    await this.gameRepository.createGames(rawEvents);
                }
            },
        });
    }
    watchCommentAdded() {
        const commentAddedEvent = viem.parseAbiItem('event CommentAdded(address indexed commentor, string message, uint256 newEndTime, uint256 prizePool, uint256 timestamp)');
        this.unwatchCommentAdded = this.client.watchEvent({
            event: commentAddedEvent,
            onLogs: async (logs) => {
                const rawEvents = logs.map((log) => ({
                    ...log.args,
                    gameAddress: log.address,
                }));
                if (rawEvents.length > 0) {
                    await this.commentRepository.addComments(rawEvents);
                }
            },
        });
    }
};
exports.BlockchainService = BlockchainService;
exports.BlockchainService = BlockchainService = BlockchainService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        game_repository_1.GameRepository,
        comment_repository_1.CommentRepository])
], BlockchainService);
//# sourceMappingURL=blockchain.service.js.map