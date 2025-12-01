"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterTransactionSchema = void 0;
const zod_1 = require("zod");
const ethereumAddressSchema = zod_1.z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, '유효한 이더리움 주소여야 합니다');
const txHashSchema = zod_1.z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, '유효한 트랜잭션 해시여야 합니다');
const eventTypeSchema = zod_1.z.enum(['PRIZE_CLAIMED', 'GAME_CREATED', 'COMMENT_ADDED']);
exports.RegisterTransactionSchema = zod_1.z.object({
    txHash: txHashSchema,
    gameAddress: ethereumAddressSchema,
    eventType: eventTypeSchema,
});
//# sourceMappingURL=transaction.validator.js.map