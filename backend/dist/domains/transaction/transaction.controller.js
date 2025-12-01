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
exports.TransactionController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const zod_validation_pipe_1 = require("../../common/pipes/zod-validation.pipe");
const transaction_validator_1 = require("../../common/validator/transaction.validator");
const transaction_repository_1 = require("./transaction.repository");
let TransactionController = class TransactionController {
    transactionRepository;
    constructor(transactionRepository) {
        this.transactionRepository = transactionRepository;
    }
    async register(dto) {
        const result = await this.transactionRepository.create({
            txHash: dto.txHash.toLowerCase(),
            gameAddress: dto.gameAddress.toLowerCase(),
            eventType: dto.eventType,
        });
        if (!result) {
            return {
                success: false,
                message: '이미 등록된 트랜잭션입니다.',
            };
        }
        return {
            success: true,
            message: '트랜잭션이 등록되었습니다.',
            data: {
                txHash: result.txHash,
                status: result.status,
            },
        };
    }
};
exports.TransactionController = TransactionController;
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(transaction_validator_1.RegisterTransactionSchema)),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TransactionController.prototype, "register", null);
exports.TransactionController = TransactionController = __decorate([
    (0, swagger_1.ApiTags)('transactions'),
    (0, common_1.Controller)('transactions'),
    __metadata("design:paramtypes", [transaction_repository_1.TransactionRepository])
], TransactionController);
//# sourceMappingURL=transaction.controller.js.map