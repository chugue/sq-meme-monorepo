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
let GameController = class GameController {
    gameRepository;
    constructor(gameRepository) {
        this.gameRepository = gameRepository;
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
    __metadata("design:paramtypes", [game_repository_1.GameRepository])
], GameController);
//# sourceMappingURL=game.controller.js.map