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
var TransactionRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionRepository = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const db_module_1 = require("../../common/db/db.module");
const schema = __importStar(require("../../common/db/schema"));
let TransactionRepository = TransactionRepository_1 = class TransactionRepository {
    db;
    logger = new common_1.Logger(TransactionRepository_1.name);
    constructor(db) {
        this.db = db;
    }
    async create(data) {
        try {
            const [result] = await this.db
                .insert(schema.pendingTransactions)
                .values(data)
                .returning();
            this.logger.log(`✅ 트랜잭션 등록: ${data.txHash}`);
            return result;
        }
        catch (error) {
            if (error.code === '23505') {
                this.logger.warn(`⚠️ 이미 등록된 트랜잭션: ${data.txHash}`);
                return null;
            }
            this.logger.error(`❌ 트랜잭션 등록 실패: ${error.message}`);
            throw error;
        }
    }
    async findPending() {
        return this.db
            .select()
            .from(schema.pendingTransactions)
            .where((0, drizzle_orm_1.eq)(schema.pendingTransactions.status, 'pending'));
    }
    async updateStatus(txHash, status, errorMessage) {
        try {
            await this.db
                .update(schema.pendingTransactions)
                .set({
                status,
                errorMessage: errorMessage || null,
            })
                .where((0, drizzle_orm_1.eq)(schema.pendingTransactions.txHash, txHash));
            this.logger.log(`✅ 트랜잭션 상태 업데이트: ${txHash} → ${status}`);
        }
        catch (error) {
            this.logger.error(`❌ 트랜잭션 상태 업데이트 실패: ${error.message}`);
            throw error;
        }
    }
    async incrementRetryCount(txHash) {
        try {
            await this.db.execute(`UPDATE squid_meme.pending_transactions
                 SET retry_count = retry_count + 1, updated_at = NOW()
                 WHERE tx_hash = '${txHash}'`);
        }
        catch (error) {
            this.logger.error(`❌ 재시도 횟수 증가 실패: ${error.message}`);
        }
    }
};
exports.TransactionRepository = TransactionRepository;
exports.TransactionRepository = TransactionRepository = TransactionRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(db_module_1.DrizzleAsyncProvider)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], TransactionRepository);
//# sourceMappingURL=transaction.repository.js.map