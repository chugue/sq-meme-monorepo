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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const game_repository_1 = require("./game.repository");
const game_service_1 = require("./game.service");
let GameController = class GameController {
    gameRepository;
    gameService;
    constructor(gameRepository, gameService) {
        this.gameRepository = gameRepository;
        this.gameService = gameService;
    }
    async createGame(body) {
        return this.gameService.createGame(body);
    }
    async registerClaimPrize(gameAddress, body) {
        const success = await this.gameService.processPrizeClaimedTransaction(body.txHash, gameAddress);
        return {
            success,
            message: success ? '상금 수령 처리 완료' : '상금 수령 처리 실패',
        };
    }
    async getGameByToken(tokenAddress) {
        const game = await this.gameRepository.findByTokenAddress(tokenAddress);
        if (!game) {
            throw new common_1.NotFoundException(`No game found for token address: ${tokenAddress}`);
        }
        return game;
    }
};
exports.GameController = GameController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GameController.prototype, "createGame", null);
__decorate([
    (0, common_1.Post)(':gameAddress/claim'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'claimPrize 트랜잭션 등록' }),
    (0, swagger_1.ApiParam)({
        name: 'gameAddress',
        description: '게임 컨트랙트 주소',
        example: '0x1234567890123456789012345678901234567890',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '상금 수령 처리 완료',
    }),
    __param(0, (0, common_1.Param)('gameAddress')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], GameController.prototype, "registerClaimPrize", null);
__decorate([
    (0, common_1.Get)('by-token/:tokenAddress'),
    (0, swagger_1.ApiOperation)({ summary: '토큰 주소로 게임 조회' }),
    (0, swagger_1.ApiParam)({
        name: 'tokenAddress',
        description: '게임 토큰 컨트랙트 주소 (0x...)',
        example: '0xfda7278df9b004e05dbaa367fc2246a4a46271c9',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '게임 정보',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: '해당 토큰으로 생성된 게임이 없습니다',
    }),
    __param(0, (0, common_1.Param)('tokenAddress')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GameController.prototype, "getGameByToken", null);
exports.GameController = GameController = __decorate([
    (0, swagger_1.ApiTags)('Games'),
    (0, common_1.Controller)('/v1/games'),
    __metadata("design:paramtypes", [game_repository_1.GameRepository,
        game_service_1.GameService])
], GameController);
//# sourceMappingURL=game.controller.js.map