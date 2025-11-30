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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var GameRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRepository = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const db_module_1 = require("../../common/db/db.module");
const schema = __importStar(require("../../common/db/schema"));
const game_validator_1 = require("../../common/validator/game.validator");
let GameRepository = GameRepository_1 = class GameRepository {
    db;
    logger = new common_1.Logger(GameRepository_1.name);
    constructor(db) {
        this.db = db;
    }
    async createGames(rawEvents) {
        if (rawEvents.length === 0)
            return [];
        const games = rawEvents
            .map((event) => {
            const result = game_validator_1.GameCreatedEventSchema.safeParse(event);
            if (!result.success) {
                this.logger.error(`❌ 검증 실패 - ${result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
                this.logger.debug(`원본 데이터: ${JSON.stringify(event, (_, v) => typeof v === 'bigint' ? `BigInt(${v})` : v)}`);
                return null;
            }
            const data = result.data;
            return {
                gameId: data.gameId,
                gameAddress: data.gameAddr,
                gameToken: data.gameTokenAddr,
                tokenSymbol: data.tokenSymbol,
                tokenName: data.tokenName,
                initiator: data.initiator,
                gameTime: data.gameTime,
                endTime: data.endTime,
                cost: data.cost,
                prizePool: data.prizePool,
                isEnded: data.isEnded,
                lastCommentor: data.lastCommentor,
            };
        })
            .filter((game) => game !== null);
        if (games.length === 0)
            return [];
        try {
            const savedGames = await this.db
                .insert(schema.games)
                .values(games)
                .returning({ gameAddress: schema.games.gameAddress });
            this.logger.log(`✅ ${savedGames.length}개 게임 저장 완료: ${savedGames.map((g) => g.gameAddress).join(', ')}`);
            return savedGames;
        }
        catch (error) {
            this.logger.error(`❌ 게임 저장 실패: ${error.message}`);
            return [];
        }
    }
    async findByTokenAddress(tokenAddress) {
        try {
            const result = await this.db
                .select()
                .from(schema.games)
                .where((0, drizzle_orm_1.eq)(schema.games.gameToken, tokenAddress.toLowerCase()))
                .limit(1);
            return result[0] || null;
        }
        catch (error) {
            this.logger.error(`❌ 토큰 주소로 게임 조회 실패 ${tokenAddress}: ${error.message}`);
            return null;
        }
    }
    async updateGameState(gameAddress, updates) {
        try {
            await this.db
                .update(schema.games)
                .set(updates)
                .where((0, drizzle_orm_1.eq)(schema.games.gameAddress, gameAddress));
        }
        catch (error) {
            this.logger.error(`❌ 게임 업데이트 실패 ${gameAddress}: ${error.message}`);
            throw error;
        }
    }
};
exports.GameRepository = GameRepository;
exports.GameRepository = GameRepository = GameRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(db_module_1.DrizzleAsyncProvider)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], GameRepository);
//# sourceMappingURL=game.repository.js.map